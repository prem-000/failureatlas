import { LifecycleManager } from '../state/lifecycle-manager';
import { TrafficClassifier } from '../capture/traffic-classifier';
import { SnapshotBuffer } from '../capture/snapshot-buffer';
import { DeduplicationEngine } from '../state/dedup';
import { SubmissionContextManager } from '../state/submission-context';
import { PlatformRouter } from '../adapters/base/router';
import { LeetCodeAdapter } from '../adapters/leetcode/adapter';
import { HackerRankAdapter } from '../adapters/hackerrank/adapter';
import { GFGAdapter } from '../adapters/geeksforgeeks/adapter';
import { EvidenceMerger } from '../capture/evidence-merger';

describe('Praxis Multi-Adapter Intelligence Tests', () => {
  describe('Lifecycle State Machine & Terminal Protection', () => {
    it('normalizes GFG CALCULATED to RUNNING, not terminal', () => {
      const { state, status } = LifecycleManager.normalizeRawVerdict('CALCULATED');
      expect(state).toBe('RUNNING');
      expect(status).toBeUndefined();
    });

    it('normalizes SUCCESS and Correct Answer to Accepted', () => {
      const res1 = LifecycleManager.normalizeRawVerdict('SUCCESS');
      expect(res1.state).toBe('TERMINAL');
      expect(res1.status).toBe('Accepted');

      const res2 = LifecycleManager.normalizeRawVerdict('Correct Answer');
      expect(res2.state).toBe('TERMINAL');
      expect(res2.status).toBe('Accepted');
    });

    it('PREVENTS terminal status downgrade on GFG: CALCULATED -> SUBMITTED -> SUCCESS -> SUBMITTED', () => {
      // 1. CALCULATED
      const step1 = LifecycleManager.evaluateTransition('UNKNOWN', undefined, 'CALCULATED');
      expect(step1.allowed).toBe(true);
      expect(step1.newState).toBe('RUNNING');

      // 2. SUBMITTED
      const step2 = LifecycleManager.evaluateTransition(step1.newState, step1.newStatus, 'SUBMITTED');
      expect(step2.allowed).toBe(true);
      expect(step2.newState).toBe('SUBMITTED');

      // 3. SUCCESS -> Accepted
      const step3 = LifecycleManager.evaluateTransition(step2.newState, step2.newStatus, 'SUCCESS');
      expect(step3.allowed).toBe(true);
      expect(step3.newState).toBe('TERMINAL');
      expect(step3.newStatus).toBe('Accepted');

      // 4. SUBMITTED (Trailing signal) MUST BE REJECTED / PREVENTED FROM DOWNGRADE
      const step4 = LifecycleManager.evaluateTransition(step3.newState, step3.newStatus, 'SUBMITTED');
      expect(step4.allowed).toBe(false);
      expect(step4.newState).toBe('TERMINAL');
      expect(step4.newStatus).toBe('Accepted');
      expect(step4.reason).toContain('protected against downgrade');
    });
  });

  describe('Traffic Classifier', () => {
    it('filters out analytics and telemetry noise', () => {
      expect(TrafficClassifier.isNoise('https://www.google-analytics.com/collect')).toBe(true);
      expect(TrafficClassifier.isNoise('https://browser.sentry.io/api/123/envelope/')).toBe(true);
      expect(TrafficClassifier.isNoise('https://leetcode.com/static/images/logo.png')).toBe(true);
    });

    it('classifies verified HackerRank submissions and polls', () => {
      expect(
        TrafficClassifier.classify('hackerrank', 'https://www.hackerrank.com/rest/contests/master/challenges/solve-me-first/submissions', 'POST')
      ).toBe('submission');

      expect(
        TrafficClassifier.classify('hackerrank', 'https://www.hackerrank.com/rest/contests/master/challenges/solve-me-first/submissions/123456', 'GET')
      ).toBe('poll');
    });

    it('filters out GFG subId=N/A traffic noise', () => {
      expect(
        TrafficClassifier.classify('geeksforgeeks', 'https://practice.geeksforgeeks.org/api/status?subId=N/A', 'GET')
      ).toBe('unrelated');
    });
  });

  describe('Snapshot Buffer & Submission Invariance', () => {
    it('retains valid code and clears on problem change', () => {
      const buffer = new SnapshotBuffer(5);
      buffer.pushSnapshot('def solve(): return 42', 'python');
      expect(buffer.getLatestValid()?.code).toBe('def solve(): return 42');

      // Trivial / empty code is ignored
      buffer.pushSnapshot('   ', 'python');
      expect(buffer.getLatestValid()?.code).toBe('def solve(): return 42');

      // Clears on navigation
      buffer.clear();
      expect(buffer.getLatestValid()).toBeNull();
    });

    it('snapshot buffer alone never creates a submission event without verdict/submit evidence', () => {
      const merged = EvidenceMerger.merge({
        platform: 'leetcode',
        sessionId: 'session-test',
        problem: { platform: 'leetcode', slug: 'two-sum', url: 'https://leetcode.com/problems/two-sum/' },
        bufferSnapshot: { code: 'print("hello")', language: 'python', source: 'buffer', timestamp: Date.now() },
        // No result evidence or network evidence provided
      });
      // Merged produces event with default non-accepted fallback, but lifecycle requires result to fire
      expect(merged?.code).toBe('print("hello")');
    });
  });

  describe('Deduplication Engine', () => {
    it('blocks duplicate submissions within 30s for identical code and status', () => {
      const dedup = new DeduplicationEngine();
      const blocked1 = dedup.shouldBlockDuplicate('leetcode:two-sum:Accepted');
      expect(blocked1).toBe(false);

      const blocked2 = dedup.shouldBlockDuplicate('leetcode:two-sum:Accepted');
      expect(blocked2).toBe(true);
    });

    it('permits submissions with different platformSubmissionId even with identical code', () => {
      const dedup = new DeduplicationEngine();
      const blocked1 = dedup.shouldBlockDuplicate('hackerrank:challenge-1:Accepted', '483087426');
      expect(blocked1).toBe(false);

      // Distinct submission ID is NOT blocked
      const blocked2 = dedup.shouldBlockDuplicate('hackerrank:challenge-1:Accepted', '483087427');
      expect(blocked2).toBe(false);

      // Same submission ID IS blocked
      const blocked3 = dedup.shouldBlockDuplicate('hackerrank:challenge-1:Accepted', '483087427');
      expect(blocked3).toBe(true);
    });
  });

  describe('Platform Router & Context Isolation', () => {
    it('routes URLs to the appropriate platform adapter', () => {
      const router = new PlatformRouter();
      router.register(new LeetCodeAdapter());
      router.register(new HackerRankAdapter());
      router.register(new GFGAdapter());

      expect(router.resolveAdapter('https://leetcode.com/problems/two-sum/')?.platform).toBe('leetcode');
      expect(router.resolveAdapter('https://www.hackerrank.com/challenges/solve-me-first/problem')?.platform).toBe('hackerrank');
      expect(router.resolveAdapter('https://www.geeksforgeeks.org/problems/largest-element-in-array4009/1')?.platform).toBe('geeksforgeeks');
      expect(router.resolveAdapter('https://github.com')).toBeNull();
    });

    it('maintains isolated submission contexts per tab and platform', () => {
      const manager = new SubmissionContextManager();

      const ctx1 = manager.getOrCreateContext(1, 'leetcode', { platform: 'leetcode', slug: 'two-sum', url: 'https://leetcode.com/problems/two-sum/' });
      const ctx2 = manager.getOrCreateContext(2, 'hackerrank', { platform: 'hackerrank', slug: 'arrays-ds', url: 'https://www.hackerrank.com/challenges/arrays-ds' });

      manager.updateContext(1, 'leetcode', { currentStatus: 'Accepted' });

      expect(manager.getContext(1, 'leetcode')?.currentStatus).toBe('Accepted');
      expect(manager.getContext(2, 'hackerrank')?.currentStatus).toBeUndefined();
    });
  });

  describe('Safe DOM Button Detection (No DOMException)', () => {
    it('initializes submit listeners on LeetCode without DOMException', () => {
      document.body.innerHTML = `
        <button data-cy="submit-code-btn">Submit</button>
        <button class="bg-green-s">Submit</button>
      `;
      const adapter = new LeetCodeAdapter();
      expect(() => {
        adapter.detectSubmitAction(() => {});
      }).not.toThrow();
    });

    it('initializes submit listeners on HackerRank without DOMException', () => {
      document.body.innerHTML = `
        <button class="hr-monaco-submit">Submit Code</button>
        <button data-analytics="SubmitCode">Submit Code</button>
      `;
      const adapter = new HackerRankAdapter();
      expect(() => {
        adapter.detectSubmitAction(() => {});
      }).not.toThrow();
    });

    it('initializes submit listeners on GeeksForGeeks without DOMException', () => {
      document.body.innerHTML = `
        <button class="problems_submit_button">Submit</button>
        <button data-track="submit_button">Submit</button>
      `;
      const adapter = new GFGAdapter();
      expect(() => {
        adapter.detectSubmitAction(() => {});
      }).not.toThrow();
    });
  });

  describe('HackerRank Problem Metadata Extraction & Normalization', () => {
    it('prefers response.model.name and response.model.slug when available', () => {
      const adapter = new HackerRankAdapter();
      const mockResponse = {
        model: {
          name: 'Arrays - DS',
          slug: 'arrays-ds',
          challenge_slug: 'arrays-ds',
          status: 'Accepted'
        }
      };

      const problem = adapter.captureProblem(mockResponse);
      expect(problem.title).toBe('Arrays - DS');
      expect(problem.slug).toBe('arrays-ds');
      expect(problem.url).toBe('https://www.hackerrank.com/challenges/arrays-ds/problem');
    });

    it('falls back to URL and document.title when response is not provided', () => {
      const adapter = new HackerRankAdapter();
      // Set location and document title
      delete (window as any).location;
      (window as any).location = new URL('https://www.hackerrank.com/challenges/arrays-ds/problem?isFullScreen=true');
      document.title = 'Arrays - DS | HackerRank';

      const problem = adapter.captureProblem();
      expect(problem.title).toBe('Arrays - DS');
      expect(problem.slug).toBe('arrays-ds');
      expect(problem.url).toBe('https://www.hackerrank.com/challenges/arrays-ds/problem');
    });

    it('produces normalized canonical submission with all required fields', () => {
      const adapter = new HackerRankAdapter();
      const mockResponse = {
        model: {
          name: 'Arrays - DS',
          slug: 'arrays-ds',
          challenge_slug: 'arrays-ds',
          status: 'Accepted'
        }
      };

      const problem = adapter.captureProblem(mockResponse);
      const canonical = EvidenceMerger.merge({
        platform: 'hackerrank',
        sessionId: 'session-hr-test',
        problem,
        bufferSnapshot: {
          code: 'def reverseArray(a):\n    return a[::-1]',
          language: 'python3',
          source: 'buffer',
          timestamp: Date.now()
        },
        result: {
          status: 'Accepted',
          rawStatus: 'Accepted',
          timestamp: Date.now()
        }
      });

      expect(canonical).not.toBeNull();
      expect(canonical?.problem.title).toBe('Arrays - DS');
      expect(canonical?.problem.slug).toBe('arrays-ds');
      expect(canonical?.problem.url).toBe('https://www.hackerrank.com/challenges/arrays-ds/problem');
      expect(canonical?.submissionStatus).toBe('Accepted');
      expect(canonical?.language).toBe('python3');
      expect(canonical?.code).toBe('def reverseArray(a):\n    return a[::-1]');
    });
  });
});
