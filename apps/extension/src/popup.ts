import { ExtensionMessage } from './types';

class ExtensionPopup {
  private viewContainer: HTMLElement | null = null;
  private statusDot: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;

  private currentView: 'login' | 'dashboard' | 'settings' = 'login';
  private apiBaseUrl = 'http://localhost:3000/api';
  private isAuthenticated = false;
  private pendingCount = 0;
  private userEmail = '';
  private userName = '';

  constructor() {
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  private async init(): Promise<void> {
    this.viewContainer = document.getElementById('view-container');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    await this.updateStatus();
    this.render();
  }

  private async updateStatus(): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' } as ExtensionMessage, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          this.setStatusIndicator(false, 'Offline');
          this.isAuthenticated = false;
          this.currentView = 'login';
          resolve();
          return;
        }

        const state = response.state || {};
        this.isAuthenticated = state.isAuthenticated ?? false;
        this.apiBaseUrl = state.apiUrl || 'http://localhost:3000/api';
        this.pendingCount = state.pendingEvents || 0;
        this.userEmail = response.email || '';
        this.userName = response.name || '';

        if (this.isAuthenticated) {
          this.setStatusIndicator(true, 'Connected');
          this.currentView = 'dashboard';
        } else {
          this.setStatusIndicator(false, 'Not Auth');
          this.currentView = 'login';
        }
        resolve();
      });
    });
  }

  private setStatusIndicator(connected: boolean, text: string): void {
    if (this.statusDot) {
      this.statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
    }
    if (this.statusText) {
      this.statusText.textContent = text;
    }
  }

  private render(): void {
    if (!this.viewContainer) return;
    this.viewContainer.innerHTML = '';
    switch (this.currentView) {
      case 'login':     this.renderLoginView();     break;
      case 'dashboard': this.renderDashboardView(); break;
      case 'settings':  this.renderSettingsView();  break;
    }
  }

  // ── Login view — now uses API Key instead of email + password ───────────────
  private renderLoginView(): void {
    if (!this.viewContainer) return;
    this.viewContainer.innerHTML = `
      <div class="view">
        <h2 class="view-title">Connect Account</h2>

        <div style="
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 14px;
          font-size: 11px;
          color: #71717a;
          line-height: 1.6;
        ">
          Go to <strong style="color:#a1a1aa;">FailureAtlas → Settings → API Access</strong>
          to copy your Extension API Key, then paste it below.
        </div>

        <div class="form-group">
          <label for="apiKeyInput">EXTENSION API KEY</label>
          <input
            type="password"
            id="apiKeyInput"
            placeholder="fa_••••••••••••••••••••••••••••••••"
            autocomplete="off"
            spellcheck="false"
            style="font-family: monospace; letter-spacing: 0.05em;"
          >
        </div>

        <div class="error-msg" id="loginError" style="display:none;"></div>

        <button class="btn btn-primary" id="connectBtn" style="margin-top:10px;">
          Connect
        </button>

        <div class="settings-footer">
          <button class="nav-link" id="navSettingsBtn">Server Settings</button>
        </div>
      </div>
    `;

    document.getElementById('connectBtn')?.addEventListener('click', () => this.handleApiKeyLogin());
    document.getElementById('navSettingsBtn')?.addEventListener('click', () => {
      this.currentView = 'settings';
      this.render();
    });
    // Allow Enter key in the key field
    document.getElementById('apiKeyInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleApiKeyLogin();
    });
  }

  // ── Sends AUTHENTICATE_API_KEY message to background ────────────────────────
  private async handleApiKeyLogin(): Promise<void> {
    const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement | null;
    const connectBtn  = document.getElementById('connectBtn')  as HTMLButtonElement | null;
    const errorEl     = document.getElementById('loginError')  as HTMLElement | null;

    if (!apiKeyInput || !connectBtn) return;

    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      this.showError(errorEl, 'Please paste your Extension API Key');
      return;
    }

    if (!apiKey.startsWith('fa_')) {
      this.showError(errorEl, 'Invalid key format — key should start with fa_');
      return;
    }

    connectBtn.disabled = true;
    connectBtn.textContent = 'Verifying…';
    if (errorEl) errorEl.style.display = 'none';

    chrome.runtime.sendMessage(
      { type: 'AUTHENTICATE_API_KEY', data: { apiKey } } as ExtensionMessage,
      async (response) => {
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';

        if (chrome.runtime.lastError || !response?.success) {
          const msg = response?.error || chrome.runtime.lastError?.message || 'Authentication failed';
          this.showError(errorEl, msg);
          return;
        }

        await this.updateStatus();
        this.render();
      }
    );
  }

  // ── Dashboard view ──────────────────────────────────────────────────────────
  private renderDashboardView(): void {
    if (!this.viewContainer) return;
    const displayName  = this.escapeHtml(this.userName || this.userEmail);
    const displayEmail = this.escapeHtml(this.userEmail);

    this.viewContainer.innerHTML = `
      <div class="view">
        <h2 class="view-title">Dashboard</h2>
        <div class="user-profile-card">
          <div class="user-email">${displayName}</div>
          <div class="user-role">${displayEmail}</div>
        </div>
        <div class="stat-row">
          <span class="stat-label">Pending Sync</span>
          <span class="stat-value">
            <span class="badge ${this.pendingCount > 0 ? 'badge-warning' : 'badge-success'}">
              ${this.pendingCount} event${this.pendingCount !== 1 ? 's' : ''}
            </span>
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">API Server</span>
          <span class="stat-value" style="font-size:11px; color:#a1a1aa; word-break:break-all;">
            ${this.escapeHtml(this.apiBaseUrl)}
          </span>
        </div>
        <div class="actions-container">
          <button class="btn btn-primary" id="syncBtn" ${this.pendingCount === 0 ? 'disabled' : ''}>
            Sync Queue Now
          </button>
          <button class="btn btn-secondary" id="openWebBtn">Open Web Dashboard</button>
        </div>
        <div class="settings-footer">
          <button class="nav-link" id="navSettingsBtn">Settings</button>
          <button class="nav-link" id="logoutBtn" style="color:#ef4444;">Disconnect</button>
        </div>
      </div>
    `;

    document.getElementById('syncBtn')?.addEventListener('click', () => this.handleSync());
    document.getElementById('openWebBtn')?.addEventListener('click', () => {
      const dashboardUrl = this.apiBaseUrl.replace(/\/api\/?$/, '') + '/dashboard';
      chrome.tabs.create({ url: dashboardUrl });
    });
    document.getElementById('navSettingsBtn')?.addEventListener('click', () => {
      this.currentView = 'settings';
      this.render();
    });
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
  }

  private handleSync(): void {
    const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement | null;
    if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = 'Syncing…'; }

    chrome.runtime.sendMessage({ type: 'SYNC_PENDING' } as ExtensionMessage, async () => {
      await this.updateStatus();
      this.render();
    });
  }

  private handleLogout(): void {
    chrome.runtime.sendMessage({ type: 'LOGOUT' } as ExtensionMessage, async () => {
      await this.updateStatus();
      this.render();
    });
  }

  // ── Settings view ───────────────────────────────────────────────────────────
  private renderSettingsView(): void {
    if (!this.viewContainer) return;
    this.viewContainer.innerHTML = `
      <div class="view">
        <h2 class="view-title">Settings</h2>
        <div class="form-group">
          <label for="apiUrlInput">API SERVER URL</label>
          <input type="url" id="apiUrlInput" value="${this.escapeHtml(this.apiBaseUrl)}">
        </div>
        <div class="error-msg" id="settingsError" style="display:none;"></div>
        <div id="settingsSuccess" style="display:none; color:#22c55e; font-size:12px; text-align:center; padding:6px;">
          Settings saved ✓
        </div>
        <button class="btn btn-primary" id="saveSettingsBtn" style="margin-top:10px;">Save Configuration</button>
        <button class="btn btn-ghost" id="backSettingsBtn" style="margin-top:6px;">Back</button>
      </div>
    `;

    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => this.handleSaveSettings());
    document.getElementById('backSettingsBtn')?.addEventListener('click', async () => {
      await this.updateStatus();
      this.render();
    });
  }

  private handleSaveSettings(): void {
    const apiUrlInput = document.getElementById('apiUrlInput') as HTMLInputElement | null;
    const saveBtn     = document.getElementById('saveSettingsBtn') as HTMLButtonElement | null;
    const errorEl     = document.getElementById('settingsError') as HTMLElement | null;
    const successEl   = document.getElementById('settingsSuccess') as HTMLElement | null;

    if (!apiUrlInput || !saveBtn) return;

    let url = apiUrlInput.value.trim();
    if (!url) { this.showError(errorEl, 'API Server URL cannot be empty'); return; }
    if (!/^https?:\/\//i.test(url)) {
      this.showError(errorEl, 'URL must start with http:// or https://');
      return;
    }
    url = url.replace(/\/$/, '');

    saveBtn.disabled = true;
    if (errorEl)   errorEl.style.display   = 'none';
    if (successEl) successEl.style.display = 'none';

    chrome.runtime.sendMessage(
      { type: 'SET_API_URL', data: { url } } as ExtensionMessage,
      async (response) => {
        saveBtn.disabled = false;
        if (chrome.runtime.lastError || !response?.success) {
          this.showError(errorEl, 'Failed to save settings');
          return;
        }
        this.apiBaseUrl = url;
        if (successEl) {
          successEl.style.display = 'block';
          setTimeout(() => { successEl.style.display = 'none'; }, 2000);
        }
      }
    );
  }

  // ── Utilities ───────────────────────────────────────────────────────────────
  private showError(container: HTMLElement | null, text: string): void {
    if (!container) return;
    container.textContent = text;
    container.style.display = 'block';
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

new ExtensionPopup();