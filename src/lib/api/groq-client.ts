/**
 * src/lib/api/groq-client.ts
 * Centralized Groq API client with support for multi-key chaining,
 * rate limit handling, failover, least-used selection, and exponential backoff.
 */

import { fetch } from 'next/dist/compiled/@edge-runtime/primitives';

interface KeyConfig {
  key: string;
  name: string;
  usageCount: number;
  isHealthy: boolean;
  cooldownUntil: number;
}

class MultiKeyGroqClient {
  private keys: KeyConfig[] = [];
  private currentKeyIndex = 0;
  private maxRetries = 3;
  private timeoutMs = 30000;
  private strategy: 'round-robin' | 'failover' | 'least-used' = 'round-robin';
  private defaultModel = 'llama-3.1-8b-instant';

  constructor() {
    this.initKeys();
    this.loadConfig();
  }

  private initKeys() {
    this.keys = [];
    // Load numbered keys: GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
    let index = 1;
    while (true) {
      const keyVal = process.env[`GROQ_API_KEY_${index}`];
      if (!keyVal) break;
      this.keys.push({
        key: keyVal,
        name: `GROQ_API_KEY_${index}`,
        usageCount: 0,
        isHealthy: true,
        cooldownUntil: 0,
      });
      index++;
    }

    // Fallback to standard GROQ_API_KEY if no numbered keys exist
    const fallbackKey = process.env.GROQ_API_KEY;
    if (this.keys.length === 0 && fallbackKey && fallbackKey !== 'your_groq_key_here') {
      this.keys.push({
        key: fallbackKey,
        name: 'GROQ_API_KEY',
        usageCount: 0,
        isHealthy: true,
        cooldownUntil: 0,
      });
    }

    console.log(`[GroqClient] Initialized with ${this.keys.length} API keys.`);
  }

  private loadConfig() {
    const strategyEnv = process.env.GROQ_KEY_STRATEGY;
    if (strategyEnv === 'round-robin' || strategyEnv === 'failover' || strategyEnv === 'least-used') {
      this.strategy = strategyEnv;
    }

    const retriesEnv = process.env.GROQ_MAX_RETRIES;
    if (retriesEnv) {
      const val = parseInt(retriesEnv, 10);
      if (!isNaN(val)) this.maxRetries = val;
    }

    const timeoutEnv = process.env.GROQ_TIMEOUT;
    if (timeoutEnv) {
      const val = parseInt(timeoutEnv, 10);
      if (!isNaN(val)) this.timeoutMs = val;
    }

    const modelEnv = process.env.GROQ_MODEL;
    if (modelEnv) {
      this.defaultModel = modelEnv;
    }

    console.log(
      `[GroqClient] Config: strategy=${this.strategy}, maxRetries=${this.maxRetries}, timeoutMs=${this.timeoutMs}, defaultModel=${this.defaultModel}`
    );
  }

  /**
   * Recovers cooldown keys if the cooldown duration has passed.
   */
  private checkCooldowns() {
    const now = Date.now();
    for (const key of this.keys) {
      if (!key.isHealthy && key.cooldownUntil <= now) {
        key.isHealthy = true;
        key.cooldownUntil = 0;
        console.log(`[GroqClient] Key recovered from cooldown: ${key.name}`);
      }
    }
  }

  /**
   * Selection strategy to get the next healthy key.
   */
  private getNextHealthyKey(): KeyConfig | null {
    this.checkCooldowns();
    const healthyKeys = this.keys.filter(k => k.isHealthy);

    if (healthyKeys.length === 0) {
      console.warn('[GroqClient] No healthy keys available! Attempting to use oldest cooldown key.');
      // Find key with earliest cooldown expiry
      const sortedByCooldown = [...this.keys].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
      return sortedByCooldown[0] || null;
    }

    if (this.strategy === 'failover') {
      // Always select first healthy key
      return healthyKeys[0];
    } else if (this.strategy === 'least-used') {
      // Select healthy key with lowest usageCount
      const sortedByUsage = [...healthyKeys].sort((a, b) => a.usageCount - b.usageCount);
      return sortedByUsage[0];
    } else {
      // Default: round-robin
      let checkedCount = 0;
      while (checkedCount < this.keys.length) {
        const key = this.keys[this.currentKeyIndex];
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        if (key.isHealthy) {
          return key;
        }
        checkedCount++;
      }
      return healthyKeys[0];
    }
  }

  /**
   * Puts a key on cooldown due to rate limits or errors.
   */
  private markKeyUnhealthy(keyConfig: KeyConfig, durationMs: number = 60000) {
    keyConfig.isHealthy = false;
    keyConfig.cooldownUntil = Date.now() + durationMs;
    console.warn(`[GroqClient] Key marked unhealthy: ${keyConfig.name} until ${new Date(keyConfig.cooldownUntil).toLocaleTimeString()}`);
  }

  /**
   * Executes a Chat Completion request to Groq API.
   */
  public async getChatCompletion(payload: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    response_format?: { type: 'json_object' };
    model?: string;
  }): Promise<{ content: string; keyUsed: string }> {
    let attempt = 0;
    let delayMs = 1000; // Starting backoff delay

    while (attempt <= this.maxRetries) {
      const activeKey = this.getNextHealthyKey();
      if (!activeKey) {
        throw new Error('[GroqClient] No API keys configured or available.');
      }

      console.log(`[GroqClient] Requesting chat completion using: ${activeKey.name} (Attempt ${attempt + 1}/${this.maxRetries + 1})`);

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        activeKey.usageCount++;
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeKey.key}`,
          },
          body: JSON.stringify({
            model: payload.model || this.defaultModel,
            messages: payload.messages,
            temperature: payload.temperature !== undefined ? payload.temperature : 0.2,
            response_format: payload.response_format,
          }),
          signal: controller.signal,
        });

        clearTimeout(id);

        if (res.status === 429) {
          console.warn(`[GroqClient] HTTP 429 received on ${activeKey.name}. Mark unhealthy & retry.`);
          this.markKeyUnhealthy(activeKey, 60000); // 1 minute cooldown
          attempt++;
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.warn(`[GroqClient] HTTP ${res.status} error from ${activeKey.name}: ${errText}`);
          if (res.status >= 500) {
            this.markKeyUnhealthy(activeKey, 15000); // 15 seconds cooldown for server errors
          }
          attempt++;
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Groq returned empty response');
        }

        return { content, keyUsed: activeKey.name };
      } catch (err: any) {
        clearTimeout(id);
        console.error(`[GroqClient] Exception on ${activeKey.name}:`, err.message || err);
        if (err.name === 'AbortError') {
          console.warn(`[GroqClient] Request timed out for key ${activeKey.name}`);
          this.markKeyUnhealthy(activeKey, 30000); // 30 seconds cooldown for timeout
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new Error(`[GroqClient] Failed to complete request after ${this.maxRetries} retries.`);
  }
}

export const groqClient = new MultiKeyGroqClient();
