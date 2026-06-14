import {
  SubmissionEvent,
  StoredCredentials,
  ExtensionState,
  ExtensionMessage,
} from './types';

// ─── API URL Normalization Utility ───────────────────────────────────────────
export function normalizeApiBaseUrl(url: string): string {
  if (!url) return 'http://127.0.0.1:3000/api';
  let clean = url.trim();
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  // Strip any accidental endpoint suffixes
  clean = clean.replace(/\/submissions(\/.*)?$/i, '');
  clean = clean.replace(/\/auth(\/.*)?$/i, '');
  
  // Ensure it ends with /api
  if (!clean.endsWith('/api') && !/\/api(\/|$)/i.test(clean)) {
    clean = clean + '/api';
  }
  return clean;
}

// ─── Privacy Manager ──────────────────────────────────────────────────────────
class PrivacyManager {
  static sanitizeCode(code: string): string {
    return code.replace(/\/\/.*?(@|email|name|phone).*/gi, '// [comment removed]');
  }

  static async anonymizeUserId(rawId: string): Promise<string> {
    try {
      const msgBuffer = new TextEncoder().encode(rawId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch {
      return 'anonymous_user';
    }
  }

  static validateEvent(event: any): { valid: boolean; missing?: string } {
    const required = ['eventId', 'sessionId', 'problemSlug', 'submissionStatus', 'timestamp'];
    for (const key of required) {
      if (event[key] == null || event[key] === '') {
        console.warn(`[FailureAtlas BG] Validation failed: missing "${key}". Event:`, JSON.stringify(event, null, 2));
        return { valid: false, missing: key };
      }
    }
    return { valid: true };
  }
}

// ─── Storage Manager ──────────────────────────────────────────────────────────
export class StorageManager {
  async getCredentials(): Promise<StoredCredentials | null> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return null;
      const stored = await chrome.storage.local.get(['credentials']);
      return (stored.credentials as StoredCredentials) || null;
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to read credentials from storage:', e);
      return null;
    }
  }

  async setCredentials(creds: StoredCredentials): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;
      await chrome.storage.local.set({ credentials: creds });
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to write credentials to storage:', e);
    }
  }

  async clearCredentials(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;
      await chrome.storage.local.remove(['credentials']);
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to clear credentials from storage:', e);
    }
  }

  async getApiUrl(): Promise<string> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return 'http://127.0.0.1:3000/api';
      const stored = await chrome.storage.local.get(['apiUrl', 'apiBaseUrl']);
      const url = (stored.apiBaseUrl as string) || (stored.apiUrl as string) || 'http://127.0.0.1:3000/api';
      return normalizeApiBaseUrl(url);
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to read API URL from storage:', e);
      return 'http://127.0.0.1:3000/api';
    }
  }

  async setApiUrl(url: string): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;
      const clean = normalizeApiBaseUrl(url);
      await chrome.storage.local.set({ apiUrl: clean, apiBaseUrl: clean });
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to save API URL to storage:', e);
    }
  }

  async getPendingEvents(): Promise<SubmissionEvent[]> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return [];
      const stored = await chrome.storage.local.get(['pendingEvents']);
      return (stored.pendingEvents as SubmissionEvent[]) || [];
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to read pending events from storage:', e);
      return [];
    }
  }

  async addPendingEvent(event: SubmissionEvent): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;
      const events = await this.getPendingEvents();
      // Deduplicate queue based on eventId and submissionTraceId
      const isDuplicate = events.some(
        e => e.eventId === event.eventId || 
        (event.submissionTraceId && e.submissionTraceId === event.submissionTraceId)
      );
      if (isDuplicate) {
        console.log(`[FailureAtlas BG] Event ${event.eventId} is already queued. Skipping duplicate.`);
        return;
      }
      events.push(event);
      const trimmed = events.slice(-50);
      await chrome.storage.local.set({ pendingEvents: trimmed });
      this.updateBadge(trimmed.length);
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to add pending event:', e);
    }
  }

  async clearSentEvents(count: number): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;
      const events = await this.getPendingEvents();
      const remaining = events.slice(count);
      await chrome.storage.local.set({ pendingEvents: remaining });
      this.updateBadge(remaining.length);
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to clear sent events:', e);
    }
  }

  async getState(): Promise<ExtensionState> {
    const creds  = await this.getCredentials();
    const apiUrl = await this.getApiUrl();
    const pending = await this.getPendingEvents();
    return {
      isAuthenticated: !!creds?.apiKey || !!creds?.token,
      userId: creds?.userId,
      apiUrl,
      pendingEvents: pending.length,
      sessionActive: true,
    };
  }

  updateBadge(count: number): void {
    try {
      if (typeof chrome !== 'undefined' && chrome?.action && typeof chrome.action.setBadgeText === 'function') {
        chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      }
    } catch (e) {
      console.error('[FailureAtlas BG] Failed to update badge:', e);
    }
  }
}

// ─── FailureAtlas API Client ──────────────────────────────────────────────────
export class FailureAtlasAPI {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const creds = await this.storage.getCredentials();
    const token = creds?.apiKey || creds?.token;
    if (token) {
      if (token.startsWith('fa_')) {
        headers['X-API-Key'] = token;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async authenticateWithApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiUrl = await this.storage.getApiUrl();
      const response = await fetch(`${apiUrl}/auth/verify-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ apiKey }),
      });

      const body = await response.json();

      if (!response.ok || !body.success) {
        return { success: false, error: body?.error?.message || 'Invalid API key' };
      }

      await this.storage.setCredentials({
        apiKey,
        token: apiKey,
        userId: body.data?.user?.id || 'unknown',
        email:  body.data?.user?.email || '',
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      });

      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        await chrome.storage.local.set({
          userEmail: body.data?.user?.email || '',
          userName:  body.data?.user?.name  || '',
        });
      }

      console.log('[FailureAtlas BG] API key verified for:', body.data?.user?.email);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during key verification' };
    }
  }

  async sendSubmission(event: SubmissionEvent): Promise<{ success: boolean; submissionId?: string; error?: string }> {
    const traceId = event.submissionTraceId || event.eventId?.substring(0, 8) || '?';
    try {
      const apiUrl  = await this.storage.getApiUrl();
      const headers = await this.buildHeaders();

      console.log(`[TRACE ${traceId}] Sending To API`);

      const response = await fetch(`${apiUrl}/submissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      console.log(`[TRACE ${traceId}] API Status ${response.status}`);
      const responseText = await response.text();

      if (response.status === 401) {
        const errDetail = (() => { try { return JSON.parse(responseText)?.error?.message; } catch { return responseText; } })();
        console.error(`[TRACE ${traceId}] Failure Reason: ${errDetail}`);
        return { success: false, error: `Auth rejected (401): ${errDetail}` };
      }

      if (response.status === 400) {
        const errDetail = (() => { try { return JSON.parse(responseText)?.error?.message; } catch { return responseText; } })();
        console.error(`[TRACE ${traceId}] Failure Reason: ${errDetail}`);
        return { success: false, error: `Validation: ${errDetail}` };
      }

      const body = (() => { try { return JSON.parse(responseText); } catch { return {}; } })();
      if (!response.ok || !body.success) {
        const reason = body.error?.message || `HTTP error ${response.status}`;
        console.error(`[TRACE ${traceId}] Failure Reason: ${reason}`);
        return { success: false, error: reason };
      }

      console.log(`[TRACE ${traceId}] Stored Successfully`);
      return { success: true, submissionId: body.submissionId };
    } catch (error: any) {
      const errorMsg = error?.message || "Network connection failed";
      
      console.error(`[TRACE ${traceId}] Network Error:`, {
        message: errorMsg,
        type: error?.constructor?.name,
        stack: error?.stack
      });
      
      // Log more details for debugging
      if (errorMsg.includes("fetch")) {
        console.error(`[TRACE ${traceId}] CORS or Network Issue - API might be down`);
        console.error(`[TRACE ${traceId}] Tried to reach: ${await this.storage.getApiUrl()}/submissions`);
      }
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  async getProfile(): Promise<any> {
    try {
      const apiUrl  = await this.storage.getApiUrl();
      const headers = await this.buildHeaders();
      const response = await fetch(`${apiUrl}/user/profile`, { headers });
      if (!response.ok) return null;
      const body = await response.json();
      return body.success ? (body.data || body.profile) : null;
    } catch {
      return null;
    }
  }
}

// ─── Retry Manager ───────────────────────────────────────────────────────────
export class RetryManager {
  private api: FailureAtlasAPI;
  private storage: StorageManager;
  private isProcessing = false;

  constructor(api: FailureAtlasAPI, storage: StorageManager) {
    this.api = api;
    this.storage = storage;
  }

  async processPendingQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const creds = await this.storage.getCredentials();
      if (!creds?.apiKey && !creds?.token) return;

      const pending = await this.storage.getPendingEvents();
      if (pending.length === 0) return;

      const batchSize = Math.min(pending.length, 10);
      const batch     = pending.slice(0, batchSize);

      console.log(`[FailureAtlas BG] Syncing ${batch.length} pending events…`);

      const results = await Promise.allSettled(
        batch.map(ev => this.api.sendSubmission(ev))
      );

      let sent = 0;
      const stillFailing: SubmissionEvent[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled' && r.value.success) {
          sent++;
        } else {
          stillFailing.push(batch[i]);
        }
      }

      const remaining = [...stillFailing, ...pending.slice(batchSize)];
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        await chrome.storage.local.set({ pendingEvents: remaining });
      }
      this.storage.updateBadge(remaining.length);

      console.log(`[FailureAtlas BG] Flush done: ${sent} sent, ${stillFailing.length} still failing.`);
    } catch (e) {
      console.error('[FailureAtlas BG] Error processing queue:', e);
    } finally {
      this.isProcessing = false;
    }
  }
}

// ─── Message Handler ──────────────────────────────────────────────────────────
export class MessageHandler {
  private api: FailureAtlasAPI;
  private storage: StorageManager;
  private retry: RetryManager;

  constructor(api: FailureAtlasAPI, storage: StorageManager, retry: RetryManager) {
    this.api = api;
    this.storage = storage;
    this.retry = retry;
  }

  setupListeners(): void {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(
        (message: ExtensionMessage, _sender, sendResponse) => {
          this.handleMessage(message)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }
      );
    }
  }

  private async handleMessage(message: ExtensionMessage): Promise<any> {
    switch (message.type) {
      case 'SUBMISSION_EVENT': {
        const event: SubmissionEvent = message.data;
        const validation = PrivacyManager.validateEvent(event);
        if (!validation.valid) {
          return { success: false, error: `Missing required parameters: ${validation.missing}` };
        }

        const creds = await this.storage.getCredentials();
        event.userId = creds?.userId
          ? await PrivacyManager.anonymizeUserId(creds.userId)
          : 'anonymous_user';
        event.submissionCode = PrivacyManager.sanitizeCode(event.submissionCode);

        // Direct upload if connected, else queue
        if (creds?.apiKey || creds?.token) {
          const apiRes = await this.api.sendSubmission(event);
          if (apiRes.success) {
            this.retry.processPendingQueue();
            return { success: true };
          } else {
            await this.storage.addPendingEvent(event);
            return { success: false, error: apiRes.error || 'API ingest failed — queued locally' };
          }
        } else {
          await this.storage.addPendingEvent(event);
          return { success: false, error: 'Not connected — queued locally' };
        }
      }

      case 'AUTHENTICATE_API_KEY': {
        const { apiKey } = message.data;
        if (!apiKey || !apiKey.startsWith('fa_')) {
          return { success: false, error: 'Invalid API key format' };
        }
        const result = await this.api.authenticateWithApiKey(apiKey);
        if (result.success) {
          this.retry.processPendingQueue();
        }
        return result;
      }

      case 'AUTHENTICATE': {
        const { email, password } = message.data;
        try {
          const apiUrl = await this.storage.getApiUrl();
          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const body = await response.json();
          if (!response.ok || !body.success) {
            return { success: false, error: body?.error?.message || 'Login failed' };
          }
          const tokenData = body.data?.token;
          const token = typeof tokenData === 'object' ? tokenData?.token : tokenData;
          if (!token) return { success: false, error: 'No token returned from API' };

          await this.storage.setCredentials({
            token,
            apiKey: token,
            userId: body.data?.user?.id || 'unknown',
            email:  body.data?.user?.email || email,
            expiresAt: Date.now() + 86400 * 1000,
          });

          if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
            await chrome.storage.local.set({
              userEmail: body.data?.user?.email || email,
              userName:  body.data?.user?.name  || '',
            });
          }
          this.retry.processPendingQueue();
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message || 'Network error' };
        }
      }

      case 'GET_STATUS': {
        const state = await this.storage.getState();
        let userEmail = null;
        let userName = null;
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          const stored = await chrome.storage.local.get(['userEmail', 'userName']);
          userEmail = (stored.userEmail as string) || null;
          userName = (stored.userName as string) || null;
        }
        return {
          success: true,
          state,
          email: userEmail,
          name:  userName,
        };
      }

      case 'SYNC_PENDING': {
        await this.retry.processPendingQueue();
        return { success: true };
      }

      case 'SET_API_URL': {
        await this.storage.setApiUrl(message.data.url);
        return { success: true };
      }

      case 'LOGOUT': {
        await this.storage.clearCredentials();
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          await chrome.storage.local.remove(['userEmail', 'userName']);
        }
        return { success: true };
      }

      case 'PING':
        return { pong: true };

      default:
        return { success: false, error: `Unsupported message type: ${(message as any).type}` };
    }
  }

  async checkApiHealth(): Promise<boolean> {
    try {
      const apiUrl = await this.storage.getApiUrl();
      const response = await fetch(`${apiUrl}/health`);
      
      if (!response.ok) {
        console.error('[FailureAtlas BG] API returned:', response.status);
        return false;
      }
      
      const data = await response.json();
      console.log('[FailureAtlas BG] API Health Check:', data);
      return data.status === 'ok';
    } catch (error: any) {
      console.error('[FailureAtlas BG] Health check failed:', error.message);
      return false;
    }
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const storage = new StorageManager();
const api     = new FailureAtlasAPI(storage);
const retry   = new RetryManager(api, storage);
const handler = new MessageHandler(api, storage, retry);

try {
  handler.setupListeners();
} catch (e) {
  console.error('[FailureAtlas BG] Failed to setup message listener:', e);
}

// Setup alarms and install handler defensively
try {
  if (typeof chrome !== 'undefined' && chrome?.alarms && typeof chrome.alarms.create === 'function') {
    chrome.alarms.create('sync-pending', { periodInMinutes: 5 });
    chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
      if (alarm.name === 'sync-pending') {
        retry.processPendingQueue().catch(err => {
          console.error('[FailureAtlas BG] Alarm processing failed:', err);
        });
      }
    });
  } else {
    console.warn('[FailureAtlas BG] chrome.alarms is not available. Queue sync alarm skipped.');
  }
} catch (e) {
  console.error('[FailureAtlas BG] Failed to initialize alarms:', e);
}

try {
  if (typeof chrome !== 'undefined' && chrome?.runtime?.onInstalled) {
    chrome.runtime.onInstalled.addListener(async () => {
      try {
        const isHealthy = await handler.checkApiHealth();
        if (!isHealthy) {
          console.warn('[FailureAtlas BG] API is not healthy. Extension will queue submissions.');
        }
      } catch (error) {
        console.error('[FailureAtlas BG] onInstalled error:', error);
      }
    });
  }
} catch (e) {
  console.error('[FailureAtlas BG] Failed to initialize onInstalled listener:', e);
}