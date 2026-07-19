import { EditorSnapshot } from '@/types/platform-adapter';

export class TUFEditorHook {
  private cachedCode = '';
  private cachedLanguage = '';
  private intervalId: number | null = null;

  start(): void {
    if (this.intervalId !== null) return;
    this.updateNow();
    this.intervalId = window.setInterval(() => {
      this.updateNow();
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  updateNow(): void {
    const code = this.extractCode();
    if (code && code.trim().length > 0) {
      this.cachedCode = code;
    }
    const lang = this.extractLanguage();
    if (lang) {
      this.cachedLanguage = lang;
    }
  }

  getSnapshot(): EditorSnapshot {
    return {
      code: this.cachedCode,
      language: this.cachedLanguage || 'python3', // fallback
      timestamp: Date.now()
    };
  }

  private extractCode(): string {
    // 1. Monaco API
    try {
      const monacoModel = (window as any)?.monaco?.editor?.getModels?.()[0];
      if (monacoModel) {
        const val = monacoModel.getValue();
        if (val && val.trim().length > 0) return val;
      }
    } catch (e) {}

    // 2. CodeMirror
    try {
      const cmContent = document.querySelector('.cm-content') as HTMLElement;
      if (cmContent) {
        const cmLines = cmContent.querySelectorAll('.cm-line');
        if (cmLines.length > 0) {
          const val = Array.from(cmLines).map(line => line.textContent || '').join('\n');
          if (val && val.trim().length > 0) return val;
        }
        const val = cmContent.textContent || '';
        if (val && val.trim().length > 0) return val;
      }
    } catch (e) {}

    // 3. DOM fallback (e.g. view-line)
    try {
      const lines = document.querySelectorAll('.monaco-editor .view-line');
      if (lines.length > 0) {
        const val = Array.from(lines).map(line => line.textContent || '').join('\n');
        if (val && val.trim().length > 0) return val;
      }
    } catch (e) {}

    // 4. Textarea
    const selectors = [
      'textarea.inputarea',
      '.monaco-editor textarea',
      '.cm-editor textarea',
      '#editor textarea',
      '.CodeMirror textarea',
      'textarea'
    ];
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector) as HTMLTextAreaElement;
        if (el && el.value && el.value.trim().length > 0) {
          return el.value;
        }
      } catch (e) {}
    }

    return '';
  }

  private extractLanguage(): string {
    const selectors = [
      'button[id*="lang"]',
      '[class*="lang"] button',
      'button[class*="language"]',
      '[data-cy="lang-select"] .ant-select-selection-item',
      '.lang-select .ant-select-selection-item',
      'span.text-xs',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el?.textContent) {
          const txt = el.textContent.trim().toLowerCase();
          if (txt) return txt;
        }
      } catch (e) {}
    }
    return '';
  }
}
