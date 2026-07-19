# FailureAtlas Chrome Extension

## Overview

The FailureAtlas Chrome Extension is the data collection frontend that passively monitors coding platform submissions and feeds failure data into the FailureAtlas analysis pipeline. Built with Manifest V3, it provides seamless, non-intrusive capture of coding session data across multiple competitive programming and practice platforms.

## Manifest V3 Architecture

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "FailureAtlas",
  "version": "1.1.0",
  "description": "FailureAtlas Chrome Extension — Multi-platform submission capture (LeetCode, TUF, HackerRank, Codeforces & more)",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "webNavigation",
    "webRequest",
    "alarms"
  ],
  "host_permissions": [
    "https://leetcode.com/*",
    "https://*.takeuforward.org/*",
    "https://codeforces.com/*",
    "https://*.hackerrank.com/*",
    "https://*.codechef.com/*",
    "https://atcoder.jp/*",
    "https://*.geeksforgeeks.org/*",
    "https://api.failureatlas.dev/*",
    "http://localhost:3000/*",
    "http://localhost:3000/api/*",
    "http://127.0.0.1:3000/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://leetcode.com/*",
        "https://*.takeuforward.org/*",
        "https://codeforces.com/*",
        "https://*.hackerrank.com/*",
        "https://*.codechef.com/*",
        "https://atcoder.jp/*",
        "https://*.geeksforgeeks.org/*"
      ],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "FailureAtlas"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## Permission Requirements and Justifications

### Core Permissions

#### `storage`
**Purpose**: Store user authentication tokens, session data, and cached Practice Sessions locally.
**Scope**: Limited to extension-specific data.
**Data Stored**:
- JWT authentication token
- User preference settings
- Cached submission data (max 100 entries)
- Problem metadata cache

#### `activeTab`
**Purpose**: Access to currently active coding platform tabs for DOM inspection and event monitoring.
**Scope**: Enabled only when the user is actively navigating a supported platform.
**Usage**:
- Detect submission clicks and solve attempts
- Extract problem metadata from the DOM
- Monitor code editor changes and text selections

#### `scripting`
**Purpose**: Inject content scripts to monitor platform interfaces and register Monaco/CodeMirror hooks.
**Scope**: Limited to registered host domains.
**Functions**:
- Monitor submission events and DOM mutations
- Extract code from Monaco/CodeMirror editor instances
- Detect test result updates and run outputs

#### `webNavigation`
**Purpose**: Detect navigation between problems to track session continuity and time-on-problem.
**Scope**: Registered domains only.
**Usage**:
- Track problem page transitions
- Measure elapsed time on a problem
- Detect session boundaries and tab changes

#### `webRequest`
**Purpose**: Intercept platform-specific AJAX requests to capture raw submission responses (e.g. for TUF and HackerRank network requests).
**Scope**: Supported host platforms.

#### `alarms`
**Purpose**: Schedule background synchronization runs and retry-queues for offline-caching.

### Host Permissions

#### `https://leetcode.com/*`, `https://*.takeuforward.org/*`, `https://codeforces.com/*`, `https://*.hackerrank.com/*`, `https://*.codechef.com/*`, `https://atcoder.jp/*`, `https://*.geeksforgeeks.org/*`
**Purpose**: Access to supported problem platforms for submission event capture.
**Justification**: Core functionality requires monitoring solving activity across these sites.
**Data Collected**:
- Problem metadata (title, slug, difficulty, topics/tags)
- Submission details (language, code, execution status, runtime, memory)
- Test case statistics (total count, passed count, failed test case inputs/outputs)

#### `https://api.failureatlas.dev/*`, `http://localhost:3000/*`
**Purpose**: Transmit collected submission data and retrieve user-profiles.
**Justification**: Enables the extension to sync data to the central database.
**Data Transmitted**:
- Anonymized submission event records
- Code diff evolution snapshots
- Extracted behavioral signals (rapid submissions, duration)

## Content Script Injection Strategy

### Selective Activation

The extension activates only on specific LeetCode URL patterns to minimize resource usage and privacy impact:

```javascript
// content.js - Selective activation logic
class PraxisCollector {
  constructor() {
    this.isActive = false;
    this.sessionId = null;
    this.currentProblem = null;
    this.startTime = null;
    this.submissionCount = 0;
    
    this.initIfLeetCodeProblem();
  }
  
  initIfLeetCodeProblem() {
    // Only activate on problem pages
    const problemPattern = /\/problems\/([^\/]+)/;
    const contestPattern = /\/contest\/[^\/]+\/problems\/([^\/]+)/;
    
    if (problemPattern.test(location.pathname) || contestPattern.test(location.pathname)) {
      this.activate();
    }
  }
  
  activate() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    
    this.setupEventListeners();
    this.extractProblemMetadata();
    
    console.log('[Praxis] Activated for problem:', this.currentProblem?.slug);
  }
}
```

### DOM Observer Pattern

Uses MutationObserver to detect dynamic content changes without continuous polling:

```javascript
setupEventListeners() {
  // Watch for submission result updates
  this.resultObserver = new MutationObserver(this.handleResultChange.bind(this));
  
  // Monitor submission button area
  const submissionArea = document.querySelector('[data-cy="submission-area"]');
  if (submissionArea) {
    this.resultObserver.observe(submissionArea, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
  
  // Watch for code editor changes
  this.setupCodeMonitoring();
  
  // Detect submission button clicks
  this.setupSubmissionMonitoring();
}
```

## Data Collection Specifications

### Submission Event Data

Each submission event captures comprehensive context:

```typescript
interface SubmissionEvent {
  // Event identification
  eventId: string;                    // UUID
  sessionId: string;                  // Session UUID
  userId: string;                     // Anonymized user ID (SHA-256, 16-char hex)
  timestamp: number;                  // Unix timestamp (ms)

  // Problem context
  problemSlug: string;                // "two-sum"
  problemTitle: string;               // "Two Sum"
  problemDifficulty: 'Easy' | 'Medium' | 'Hard';
  problemTopics: string[];            // ["Array", "Hash Table"]
  problemUrl: string;                 // Full URL

  // Submission details
  submissionStatus: SubmissionStatus; // "Accepted", "Wrong Answer", etc.
  submissionLanguage: string;         // "python3", "java", "cpp"
  submissionCode: string;             // Full source code (sanitized)

  // Performance metrics
  runtime?: number;                   // Milliseconds
  memory?: number;                    // MB

  // Test case results
  testCasesPassed?: number;           // Passed count
  totalTestCases?: number;            // Total count
  failedTestCase?: string;            // Failed test input description

  // Behavioral metrics
  timeSpent: number;                  // Time on problem (ms)
  attemptNumber: number;              // 1st, 2nd, 3rd attempt
  rapidSubmission: boolean;           // true if < 30s since last submit
  codeEvolution: CodeDiff[];          // Last 5 diffs from previous snapshots
}
```

### Code Practice Tracking

Tracks code changes between attempts to enable diff analysis:

```javascript
class CodeEvolutionTracker {
  constructor() {
    this.codeHistory = [];
    this.lastCode = '';
  }
  
  captureCodeSnapshot() {
    const editor = this.findCodeEditor();
    const currentCode = this.extractCode(editor);
    
    if (currentCode !== this.lastCode) {
      const diff = this.computeDiff(this.lastCode, currentCode);
      
      this.codeHistory.push({
        timestamp: Date.now(),
        code: currentCode,
        diff: diff,
        lineCount: currentCode.split('\n').length,
        characterCount: currentCode.length
      });
      
      this.lastCode = currentCode;
    }
  }
  
  computeDiff(oldCode, newCode) {
    // Simple line-based diff for transmission
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    return {
      additions: this.getAdditions(oldLines, newLines),
      deletions: this.getDeletions(oldLines, newLines),
      modifications: this.getModifications(oldLines, newLines)
    };
  }
  
  findCodeEditor() {
    // Multiple selector strategies for robustness
    const selectors = [
      '.monaco-editor textarea',
      '[data-cy="code-editor"] textarea', 
      '.CodeMirror textarea',
      '#editor textarea'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    return null;
  }
}
```

### Problem Metadata Extraction

Extracts comprehensive problem context from DOM:

```javascript
extractProblemMetadata() {
  const metadata = {
    slug: this.extractSlugFromUrl(),
    title: this.extractTitle(),
    difficulty: this.extractDifficulty(), 
    topics: this.extractTopics(),
    description: this.extractDescription(),
    constraints: this.extractConstraints(),
    examples: this.extractExamples()
  };
  
  this.currentProblem = metadata;
  return metadata;
}

extractTitle() {
  const selectors = [
    '[data-cy="question-title"]',
    '.question-title h3',
    '.question-content h1'
  ];
  
  return this.findTextBySelectors(selectors);
}

extractDifficulty() {
  const difficultyEl = document.querySelector('[diff="1"], [diff="2"], [diff="3"]');
  if (!difficultyEl) return null;
  
  const diffMap = { '1': 'Easy', '2': 'Medium', '3': 'Hard' };
  return diffMap[difficultyEl.getAttribute('diff')];
}

extractTopics() {
  const topicElements = document.querySelectorAll('[data-cy="topic-tag"]');
  return Array.from(topicElements).map(el => el.textContent.trim());
}
```

## Backend Communication Protocol

### Message Passing Architecture

Uses Chrome's message passing API for secure communication:

```javascript
// content.js - Send data to background script
class DataTransmitter {
  async sendSubmissionEvent(eventData) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SUBMISSION_EVENT',
        data: eventData,
        timestamp: Date.now()
      });
      
      if (response.success) {
        console.log('[Praxis] Event transmitted successfully');
      }
    } catch (error) {
      console.error('[Praxis] Transmission failed:', error);
      this.queueForRetry(eventData);
    }
  }
  
  queueForRetry(eventData) {
    // Store failed transmissions for retry
    chrome.storage.local.get(['failedSubmissions'], (result) => {
      const failed = result.failedSubmissions || [];
      failed.push({ ...eventData, retryCount: 0 });
      
      chrome.storage.local.set({ failedSubmissions: failed });
    });
  }
}
```

### Background Script API Communication

```javascript
// background.js - Handle API communication
class PraxisAPI {
  constructor() {
    this.baseURL = 'https://api.praxis.dev';
    this.authToken = null;
    
    this.setupMessageListeners();
    this.loadAuthToken();
  }
  
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SUBMISSION_EVENT':
          this.handleSubmissionEvent(message.data, sendResponse);
          return true; // Async response
          
        case 'AUTHENTICATE':
          this.authenticate(message.credentials, sendResponse);
          return true;
      }
    });
  }
  
  async handleSubmissionEvent(eventData, sendResponse) {
    try {
      const response = await fetch(`${this.baseURL}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(eventData)
      });
      
      if (response.ok) {
        sendResponse({ success: true });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[Praxis] API error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}
```

### Data Privacy and Security

```javascript
class PrivacyManager {
  static anonymizeUserId(rawUserId) {
    // Hash user ID for anonymization
    const encoder = new TextEncoder();
    const data = encoder.encode(rawUserId);
    
    return crypto.subtle.digest('SHA-256', data)
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16)
      );
  }
  
  static sanitizeCode(code) {
    // Remove potential PII from code comments
    return code.replace(/\/\/.*personal.*|\/\*.*personal.*\*\//gi, '// [comment removed]');
  }
  
  static validateDataBeforeTransmission(eventData) {
    const required = ['problemSlug', 'submissionStatus', 'timestamp'];
    const missing = required.filter(field => !eventData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}
```

## Installation Guide

### Developer Mode Installation

1. **Enable Developer Mode**:
   - Open Chrome and navigate to `chrome://extensions`
   - Toggle "Developer mode" in the top-right corner

2. **Load Unpacked Extension**:
   ```bash
   # From the project root
   cd apps/extension
   npm install
   npm run build:dev    # development build with source maps
   # OR
   npm run build        # production build (minified)
   ```
   
   - Click "Load unpacked" in Chrome Extensions page
   - Select the `praxis/apps/extension/dist` folder
   - Extension will appear in toolbar with Praxis icon

3. **Configure Authentication**:
   - Click the Praxis extension icon
   - Enter your Praxis account credentials
   - Extension will authenticate and begin monitoring

4. **Verify Installation**:
   - Navigate to any LeetCode problem
   - Open Chrome DevTools Console
   - Look for `[Praxis] Activated for problem: [problem-slug]`

### Production Distribution Preparation

#### Build for Production
```bash
# From apps/extension/
npm run build          # Production build (minified, no source maps)
npm run package        # Creates distributable .zip

# Generates: praxis-extension-v1.0.0.zip
```

#### Chrome Web Store Submission
1. **Prepare Assets**:
   - High-resolution icons (128x128, 48x48, 16x16)
   - Promotional screenshots
   - Detailed description and privacy policy

2. **Upload to Developer Dashboard**:
   - Visit Chrome Web Store Developer Dashboard
   - Create new item and upload packaged extension
   - Complete store listing with screenshots and descriptions

3. **Review Process**:
   - Google reviews extension for compliance
   - Address any feedback or policy violations
   - Typical review time: 3-7 business days

## Performance Optimization

### Memory Management
```javascript
class PerformanceManager {
  constructor() {
    this.maxCachedSubmissions = 100;
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }
  
  cleanup() {
    // Remove old cached data
    chrome.storage.local.get(['cachedSubmissions'], (result) => {
      const cached = result.cachedSubmissions || [];
      
      if (cached.length > this.maxCachedSubmissions) {
        const trimmed = cached.slice(-this.maxCachedSubmissions);
        chrome.storage.local.set({ cachedSubmissions: trimmed });
      }
    });
    
    // Clear inactive observers
    this.cleanupObservers();
  }
  
  cleanupObservers() {
    if (this.resultObserver && !document.contains(this.resultObserver.target)) {
      this.resultObserver.disconnect();
      this.resultObserver = null;
    }
  }
}
```

### Network Optimization
```javascript
class NetworkManager {
  constructor() {
    this.requestQueue = [];
    this.isOnline = navigator.onLine;
    this.batchSize = 5;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingRequests();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  async sendBatchRequest(events) {
    if (!this.isOnline) {
      this.requestQueue.push(...events);
      return;
    }
    
    try {
      const response = await fetch(`${this.baseURL}/api/submissions/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ events })
      });
      
      return response.ok;
    } catch (error) {
      // Queue for retry on network error
      this.requestQueue.push(...events);
      return false;
    }
  }
}
```

## Error Handling and Debugging

### Comprehensive Error Logging
```javascript
class ErrorManager {
  static logError(context, error, additionalData = {}) {
    const errorReport = {
      timestamp: Date.now(),
      context: context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      url: location.href,
      userAgent: navigator.userAgent,
      ...additionalData
    };
    
    console.error('[Praxis Error]', errorReport);
    
    // Send to backend for analysis (non-blocking)
    this.reportError(errorReport).catch(() => {
      // Ignore reporting failures
    });
  }
  
  static async reportError(errorReport) {
    try {
      await fetch('https://api.praxis.dev/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      });
    } catch (e) {
      // Silent failure for error reporting
    }
  }
}
```

### Debug Mode
```javascript
class DebugMode {
  constructor() {
    this.enabled = localStorage.getItem('praxis_debug') === 'true';
  }
  
  log(...args) {
    if (this.enabled) {
      console.log('[Praxis Debug]', ...args);
    }
  }
  
  enable() {
    this.enabled = true;
    localStorage.setItem('praxis_debug', 'true');
    console.log('[Praxis] Debug mode enabled');
  }
  
  disable() {
    this.enabled = false;
    localStorage.removeItem('praxis_debug');
  }
}
```

## Privacy and Compliance

### Data Minimization
- Only collect data necessary for Practice Analysis
- Automatic deletion of data older than 12 months
- No collection of personal information or identifiers

### User Consent
- Clear opt-in during installation
- Granular privacy controls in extension popup
- Easy opt-out with data deletion

### GDPR Compliance
- Right to data export via API
- Right to deletion with account termination
- Transparent data usage in privacy policy

The Praxis Chrome Extension provides seamless, privacy-conscious data collection that enables the powerful Learning Intelligence analysis while maintaining user trust and compliance with privacy regulations.