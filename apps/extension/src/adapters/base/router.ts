import type { PlatformAdapter } from './PlatformAdapter';
import type { AdapterContext } from './types';

export class PlatformRouter {
  private adapters: PlatformAdapter[] = [];
  private activeAdapter: PlatformAdapter | null = null;
  private currentContext: AdapterContext | null = null;

  register(adapter: PlatformAdapter): void {
    this.adapters.push(adapter);
  }

  resolveAdapter(url: string): PlatformAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.matches(url)) {
        return adapter;
      }
    }
    return null;
  }

  getActiveAdapter(): PlatformAdapter | null {
    return this.activeAdapter;
  }

  getCurrentContext(): AdapterContext | null {
    return this.currentContext;
  }

  async route(url: string, tabId?: number): Promise<PlatformAdapter | null> {
    const matched = this.resolveAdapter(url);

    if (this.activeAdapter && this.activeAdapter !== matched) {
      console.log(`[PlatformRouter] Cleaning up previous adapter: ${this.activeAdapter.platform}`);
      await this.activeAdapter.cleanup();
      this.activeAdapter = null;
      this.currentContext = null;
    }

    if (matched && matched !== this.activeAdapter) {
      const context: AdapterContext = {
        tabId,
        platform: matched.platform,
        url,
      };
      console.log(`[PlatformRouter] Initializing adapter: ${matched.platform}`);
      await matched.initialize(context);
      this.activeAdapter = matched;
      this.currentContext = context;
    }

    return this.activeAdapter;
  }

  async cleanup(): Promise<void> {
    if (this.activeAdapter) {
      await this.activeAdapter.cleanup();
      this.activeAdapter = null;
      this.currentContext = null;
    }
  }
}
