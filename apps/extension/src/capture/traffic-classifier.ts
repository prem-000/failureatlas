import type { Platform } from '../adapters/base/types';

export type TrafficCategory = 'submission' | 'poll' | 'unrelated';

export class TrafficClassifier {
  private static readonly NOISE_PATTERNS = [
    /google-analytics\.com/i,
    /doubleclick\.net/i,
    /facebook\.net/i,
    /sentry\.io/i,
    /datadoghq\./i,
    /hotjar\.com/i,
    /segment\.io/i,
    /mixpanel\.com/i,
    /clarity\.ms/i,
    /\.(css|png|jpg|jpeg|gif|svg|woff2?|ttf|ico|map)($|\?)/i,
    /\/telemetry/i,
    /\/analytics/i,
    /\/tracking/i,
    /\/heartbeat/i,
    /\/ping/i,
    /\/logs/i,
  ];

  /**
   * Returns true if URL matches known noise/tracking/static assets.
   */
  static isNoise(url: string): boolean {
    return this.NOISE_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * Classifies network request for the active platform.
   */
  static classify(platform: Platform, url: string, method: string): TrafficCategory {
    if (this.isNoise(url)) {
      return 'unrelated';
    }

    const upperMethod = method.toUpperCase();

    switch (platform) {
      case 'leetcode':
        if (upperMethod === 'POST' && (url.includes('/graphql') || url.includes('/submit'))) {
          return 'submission';
        }
        if (upperMethod === 'GET' && (url.includes('/check/') || url.includes('/submissions/detail/'))) {
          return 'poll';
        }
        return 'unrelated';

      case 'hackerrank':
        // Exact verified prototype matching logic
        if (url.includes('hackerrank.com') && url.includes('/submissions')) {
          if (upperMethod === 'POST') {
            return 'submission';
          }
          if (upperMethod === 'GET') {
            return 'poll';
          }
        }
        return 'unrelated';

      case 'geeksforgeeks':
        if (url.includes('geeksforgeeks.org')) {
          // Filter out subId=N/A noise
          if (url.includes('subId=N/A') || url.includes('subId=undefined')) {
            return 'unrelated';
          }
          if (upperMethod === 'POST' && (url.includes('/submit') || url.includes('/run') || url.includes('/submission'))) {
            return 'submission';
          }
          if (upperMethod === 'GET' && (url.includes('/status') || url.includes('/result') || url.includes('/submission'))) {
            return 'poll';
          }
        }
        return 'unrelated';

      default:
        return 'unrelated';
    }
  }
}
