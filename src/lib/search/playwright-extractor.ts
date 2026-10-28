/**
 * src/lib/search/playwright-extractor.ts
 *
 * Playwright Page Content Extractor.
 * Safely visits web pages, strips navigation, ads, headers, footers, scripts,
 * and extracts relevant main technical facts.
 * Handles timeouts, blocked resources, and falls back to HTTP text extraction when browser sandbox is unavailable.
 */

import { isSafePublicUrl } from './web-search';

export interface ExtractedFact {
  url: string;
  title: string;
  extractedText: string;
  sourceDomain: string;
  isExtracted: boolean;
}

export class PlaywrightExtractor {
  private timeoutMs: number;
  private maxChars: number;

  constructor(timeoutMs: number = 8000, maxChars: number = 2500) {
    this.timeoutMs = timeoutMs;
    this.maxChars = maxChars;
  }

  /**
   * Safely extracts clean text from a target URL.
   */
  public async extractPageContent(url: string, fallbackTitle?: string): Promise<ExtractedFact> {
    if (!isSafePublicUrl(url)) {
      return {
        url,
        title: fallbackTitle || url,
        extractedText: '',
        sourceDomain: this.getDomain(url),
        isExtracted: false,
      };
    }

    // Try Playwright headless chromium first
    try {
      const browserResult = await this.extractWithPlaywright(url);
      if (browserResult && browserResult.length > 50) {
        return {
          url,
          title: fallbackTitle || this.getDomain(url),
          extractedText: browserResult.slice(0, this.maxChars),
          sourceDomain: this.getDomain(url),
          isExtracted: true,
        };
      }
    } catch (browserErr) {
      console.warn(`[PlaywrightExtractor] Browser extract failed for ${url}, trying HTTP fetch:`, browserErr);
    }

    // Fallback: standard HTTP fetch with HTML tag stripping
    try {
      const httpResult = await this.extractWithHttp(url);
      return {
        url,
        title: fallbackTitle || this.getDomain(url),
        extractedText: httpResult.slice(0, this.maxChars),
        sourceDomain: this.getDomain(url),
        isExtracted: httpResult.length > 0,
      };
    } catch (httpErr) {
      console.warn(`[PlaywrightExtractor] HTTP extract fallback failed for ${url}:`, httpErr);
      return {
        url,
        title: fallbackTitle || this.getDomain(url),
        extractedText: '',
        sourceDomain: this.getDomain(url),
        isExtracted: false,
      };
    }
  }

  private async extractWithPlaywright(url: string): Promise<string> {
    // Dynamic import to avoid build-time issues if playwright binary is missing in some environments
    const { chromium } = await import('@playwright/test');

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Block heavy resources for fast extraction and safety
    await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,css,woff,woff2,ttf,eot,mp4,mp3}', (route) =>
      route.abort()
    );

    const page = await context.newPage();
    page.setDefaultTimeout(this.timeoutMs);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.timeoutMs });

      // Strip boilerplate elements before collecting text
      await page.evaluate(() => {
        const removeSelectors = [
          'nav',
          'header',
          'footer',
          'aside',
          'script',
          'style',
          'noscript',
          'iframe',
          '.advertisement',
          '.ad',
          '.cookie-banner',
          '#cookie-notice',
          '.menu',
          '.sidebar',
        ];
        for (const sel of removeSelectors) {
          document.querySelectorAll(sel).forEach((el) => el.remove());
        }
      });

      // Extract main article or body text
      const extracted = await page.evaluate(() => {
        const article = document.querySelector('article, main, #content, .content, .post-content');
        const target = article || document.body;
        if (!target) return '';

        // Get readable text from paragraphs, headings, list items
        const textNodes = Array.from(target.querySelectorAll('h1, h2, h3, p, li, pre, code'))
          .map((el) => (el.textContent || '').trim())
          .filter((t) => t.length > 20);

        return textNodes.join('\n\n');
      });

      return this.cleanText(extracted);
    } finally {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }

  private async extractWithHttp(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,text/plain',
        },
        signal: controller.signal,
      });

      if (!res.ok) return '';
      const html = await res.text();

      // Clean HTML tags and scripts
      const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
      const text = noScripts.replace(/<[^>]+>/g, ' ');
      return this.cleanText(text);
    } finally {
      clearTimeout(timeout);
    }
  }

  private cleanText(raw: string): string {
    return raw
      .replace(/\s+/g, ' ')
      .replace(/(\n\s*){3,}/g, '\n\n')
      .trim();
  }

  private getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'external';
    }
  }
}

export const defaultPlaywrightExtractor = new PlaywrightExtractor();
