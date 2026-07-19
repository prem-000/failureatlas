// HackerRank Network Interceptor
// Runs in the main page context to intercept submission API calls.
// Observational only — never modifies requests or responses.

(function () {
  console.log('[FA HR] Network interceptor loaded');

  // ─── Terminal / processing state tables ───────────────────────────────────────
  var PROCESSING_STATES = [
    'processing', 'running', 'compiling', 'queued', 'submitted', 'pending', 'in progress'
  ];

  function isTerminalState(status: string): boolean {
    if (!status) return false;
    var s = status.toLowerCase().trim();
    for (var i = 0; i < PROCESSING_STATES.length; i++) {
      if (s === PROCESSING_STATES[i] || s.startsWith(PROCESSING_STATES[i])) return false;
    }
    // Must be a non-empty, non-processing string → terminal
    return s.length > 0;
  }

  // ─── URL helpers ──────────────────────────────────────────────────────────────
  function extractSlugFromUrl(): string {
    var m = window.location.pathname.match(/\/challenges\/([^/]+)/);
    return m ? m[1] : '';
  }

  function isHackerRankUrl(url: string): boolean {
    return url.includes('hackerrank.com') || url.includes('/hackerrank/');
  }

  function isSubmissionPost(url: string, method: string): boolean {
    return method.toUpperCase() === 'POST' && url.includes('/submissions');
  }

  function isSubmissionPoll(url: string, method: string): boolean {
    // Covers /submissions/12345, /submissions/12345/, /submissions/12345/check, /submissions/12345?foo=bar
    return method.toUpperCase() === 'GET' && url.includes('/submissions');
  }

  function extractSubmissionIdFromUrl(url: string): string | null {
    // Try to match a numeric ID segment after /submissions/
    var m = url.match(/\/submissions\/(\d+)/);
    return m ? m[1] : null;
  }

  // ─── Response shape detection ─────────────────────────────────────────────────
  /**
   * Resolves the actual data model from various HackerRank response shapes.
   * HackerRank has used:  { model: {...} }  |  { data: {...} }  |  { submission: {...} }  |  top-level
   */
  function resolveModel(json: any): any {
    if (!json || typeof json !== 'object') return {};
    if (json.model && typeof json.model === 'object') return json.model;
    if (json.data && typeof json.data === 'object') return json.data;
    if (json.result && typeof json.result === 'object') return json.result;
    if (json.submission && typeof json.submission === 'object') return json.submission;
    return json;
  }

  function extractSubmissionId(json: any, fallback: string | null): string | null {
    var model = resolveModel(json);
    var id = model.id ?? model.submission_id ?? json.id ?? json.submission_id;
    if (id != null) return String(id);
    return fallback;
  }

  function extractStatus(json: any): string {
    var model = resolveModel(json);
    return String(
      model.status ??
      model.result ??
      model.judge_result ??
      json.status ??
      json.result ??
      ''
    );
  }

  // ─── State ────────────────────────────────────────────────────────────────────
  var lastSubmissionId: string | null = null;
  var lastFiredId: string | null = null;

  // ─── Dispatch ─────────────────────────────────────────────────────────────────
  function tryDispatch(json: any, submissionId: string | null): void {
    var effectiveId = submissionId || lastSubmissionId || 'unknown';
    var status = extractStatus(json);

    console.log('[FA HR] Poll Response — raw json:', JSON.stringify(json).slice(0, 500));
    console.log('[FA HR] Status:', status, '| submissionId:', effectiveId);

    if (!status) {
      console.log('[FA HR] No status found — skipping');
      return;
    }

    if (!isTerminalState(status)) {
      console.log('[FA HR] Status is non-terminal — skipping (waiting for next poll)');
      return;
    }

    // Deduplicate per submission_id+status pair
    var fireKey = effectiveId + ':' + status;
    if (lastFiredId === fireKey) {
      console.log('[FA HR] Already fired for this submission+status — skipping');
      return;
    }
    lastFiredId = fireKey;

    console.log('[FA HR] Dispatching completed submission', effectiveId);
    console.log('[FA HR] Sending window.postMessage');

    window.postMessage({
      type: 'FA_HACKERRANK_RESULT',
      submissionId: effectiveId,
      result: json,
      problemSlug: extractSlugFromUrl(),
      timestamp: Date.now()
    }, '*');
  }

  // ─── Patch fetch ──────────────────────────────────────────────────────────────
  var originalFetch = window.fetch;
  (window as any).fetch = async function (...args: Parameters<typeof fetch>) {
    var requestInfo = args[0];
    var init: RequestInit = (args[1] as RequestInit) || {};
    var url = '';
    if (typeof requestInfo === 'string') {
      url = requestInfo;
    } else if (requestInfo instanceof URL) {
      url = requestInfo.href;
    } else if (requestInfo && typeof requestInfo === 'object' && 'url' in requestInfo) {
      url = (requestInfo as any).url;
    }
    var method = (
      init.method ||
      (requestInfo instanceof Request ? requestInfo.method : 'GET') ||
      'GET'
    ) as string;

    console.log('[FA HR] FETCH', method, url);

    var response = await originalFetch.apply(this as any, args);

    try {
      if (!isHackerRankUrl(url)) return response;

      var clone = response.clone();

      if (isSubmissionPost(url, method)) {
        clone.json().then(function (json: any) {
          console.log('[FA HR] Submission POST', JSON.stringify(json).slice(0, 500));
          var id = extractSubmissionId(json, null);
          if (id) {
            console.log('[FA HR] Captured submission_id from POST:', id);
            lastSubmissionId = id;
          }
        }).catch(function (e: any) { console.error('[FA HR]', e); });

      } else if (isSubmissionPoll(url, method)) {
        // Extract ID from URL first, fall back to stored
        var urlId = extractSubmissionIdFromUrl(url);
        var subId = urlId || lastSubmissionId;

        clone.json().then(function (json: any) {
          console.log('[FA HR] Poll Response', JSON.stringify(json).slice(0, 500));
          // Try to refine submission ID from response body
          var bodyId = extractSubmissionId(json, subId);
          tryDispatch(json, bodyId);
        }).catch(function (e: any) { console.error('[FA HR]', e); });
      }
    } catch (e) {
      console.error('[FA HR]', e);
    }

    return response;
  };

  // ─── Patch XMLHttpRequest ─────────────────────────────────────────────────────
  var OrigOpen = XMLHttpRequest.prototype.open;
  var OrigSend = XMLHttpRequest.prototype.send;

  (XMLHttpRequest.prototype as any).open = function (
    method: string, url: string, async?: boolean, user?: string, password?: string
  ) {
    (this as any).__fa_hr_url = url;
    (this as any).__fa_hr_method = method;
    console.log('[FA HR] XHR OPEN', method, url);
    return OrigOpen.call(this, method, url, async as boolean, user, password);
  };

  (XMLHttpRequest.prototype as any).send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', function (this: XMLHttpRequest) {
      var url: string = (this as any).__fa_hr_url || this.responseURL || '';
      var method: string = (this as any).__fa_hr_method || '';
      console.log('[FA HR] XHR COMPLETE', url);

      try {
        if (!isHackerRankUrl(url)) return;

        if (isSubmissionPost(url, method)) {
          var json = JSON.parse(this.responseText);
          console.log('[FA HR] Submission POST (XHR)', JSON.stringify(json).slice(0, 500));
          var id = extractSubmissionId(json, null);
          if (id) {
            console.log('[FA HR] Captured submission_id from XHR POST:', id);
            lastSubmissionId = id;
          }

        } else if (isSubmissionPoll(url, method)) {
          var urlId = extractSubmissionIdFromUrl(url);
          var subId = urlId || lastSubmissionId;
          var json2 = JSON.parse(this.responseText);
          console.log('[FA HR] Poll Response (XHR)', JSON.stringify(json2).slice(0, 500));
          var bodyId = extractSubmissionId(json2, subId);
          tryDispatch(json2, bodyId);
        }
      } catch (e) {
        console.error('[FA HR]', e);
      }
    });
    return OrigSend.apply(this, [body]);
  };

  // ─── Verify content script is listening ──────────────────────────────────────
  // Re-broadcast a ping so the content script can confirm the interceptor is live
  window.postMessage({ type: 'FA_HR_INTERCEPTOR_READY' }, '*');
  console.log('[FA HR] Interceptor ready — posted FA_HR_INTERCEPTOR_READY');
})();
