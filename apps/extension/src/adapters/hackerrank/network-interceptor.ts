/**
 * HackerRank Network Interceptor — Injected into page context
 * Intercepts submission POST and poll GET requests without triggering security warnings.
 * Preserves the exact verified prototype request matching logic.
 */

(function () {
  if ((window as any).__fa_hr_interceptor_installed) return;
  (window as any).__fa_hr_interceptor_installed = true;

  console.log('[FA HR] HackerRank network interceptor injecting...');

  function isHackerRankUrl(url: string): boolean {
    return url.includes('hackerrank.com');
  }

  function isSubmissionPost(url: string, method: string): boolean {
    return method.toUpperCase() === 'POST' && url.includes('/submissions');
  }

  function isSubmissionPoll(url: string, method: string): boolean {
    return method.toUpperCase() === 'GET' && url.includes('/submissions');
  }

  function extractSubmissionIdFromUrl(url: string): string | null {
    const m = url.match(/\/submissions\/(\d+)/);
    return m ? m[1] : null;
  }

  function resolveModel(json: any): any {
    if (!json || typeof json !== 'object') return {};
    if (json.model && typeof json.model === 'object') return json.model;
    if (json.data && typeof json.data === 'object') return json.data;
    if (json.result && typeof json.result === 'object') return json.result;
    if (json.submission && typeof json.submission === 'object') return json.submission;
    return json;
  }

  function extractSubmissionId(json: any, fallback: string | null): string | null {
    const model = resolveModel(json);
    const id = model.id ?? model.submission_id ?? json.id ?? json.submission_id;
    if (id != null) return String(id);
    return fallback;
  }

  function extractStatus(json: any): string {
    const model = resolveModel(json);
    return String(
      model.status ??
      model.result ??
      model.judge_result ??
      json.status ??
      json.result ??
      ''
    );
  }

  function extractSlugFromUrl(): string {
    const m = window.location.pathname.match(/\/challenges\/([^/]+)/);
    return m ? m[1] : '';
  }

  function isTerminalState(status: string): boolean {
    const lower = status.toLowerCase().trim();
    if (!lower || lower === 'processing' || lower === 'queued' || lower === 'running') {
      return false;
    }
    return true;
  }

  let lastSubmissionId: string | null = null;
  let lastFiredKey: string | null = null;

  function tryDispatch(json: any, submissionId: string | null): void {
    const effectiveId = submissionId || lastSubmissionId || 'unknown';
    const status = extractStatus(json);

    if (!status) return;
    if (!isTerminalState(status)) return;

    const fireKey = `${effectiveId}:${status}`;
    if (lastFiredKey === fireKey) return;
    lastFiredKey = fireKey;

    console.log('[FA HR] Dispatching completed HackerRank submission:', effectiveId, status);

    window.postMessage(
      {
        type: 'FA_HACKERRANK_RESULT',
        submissionId: effectiveId,
        result: json,
        problemSlug: extractSlugFromUrl(),
        timestamp: Date.now()
      },
      '*'
    );
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  (window as any).fetch = async function (...args: Parameters<typeof fetch>) {
    const requestInfo = args[0];
    const init: RequestInit = (args[1] as RequestInit) || {};
    let url = '';
    if (typeof requestInfo === 'string') {
      url = requestInfo;
    } else if (requestInfo instanceof URL) {
      url = requestInfo.href;
    } else if (requestInfo && typeof requestInfo === 'object' && 'url' in requestInfo) {
      url = (requestInfo as any).url;
    }
    const method = (
      init.method ||
      (requestInfo instanceof Request ? requestInfo.method : 'GET') ||
      'GET'
    ) as string;

    const response = await originalFetch.apply(this as any, args);

    try {
      if (!isHackerRankUrl(url)) return response;

      const clone = response.clone();

      if (isSubmissionPost(url, method)) {
        clone.json().then((json: any) => {
          const id = extractSubmissionId(json, null);
          if (id) {
            console.log('[FA HR] Captured submission_id from POST:', id);
            lastSubmissionId = id;
          }
        }).catch(() => {});
      } else if (isSubmissionPoll(url, method)) {
        const urlId = extractSubmissionIdFromUrl(url);
        const subId = urlId || lastSubmissionId;

        clone.json().then((json: any) => {
          const bodyId = extractSubmissionId(json, subId);
          tryDispatch(json, bodyId);
        }).catch(() => {});
      }
    } catch (e) {}

    return response;
  };

  // Intercept XMLHttpRequest
  const OrigOpen = XMLHttpRequest.prototype.open;
  const OrigSend = XMLHttpRequest.prototype.send;

  (XMLHttpRequest.prototype as any).open = function (
    method: string,
    url: string,
    async?: boolean,
    user?: string,
    password?: string
  ) {
    (this as any).__fa_hr_url = url;
    (this as any).__fa_hr_method = method;
    return OrigOpen.call(this, method, url, async as boolean, user, password);
  };

  (XMLHttpRequest.prototype as any).send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', function (this: XMLHttpRequest) {
      const url: string = (this as any).__fa_hr_url || this.responseURL || '';
      const method: string = (this as any).__fa_hr_method || '';

      try {
        if (!isHackerRankUrl(url)) return;

        if (isSubmissionPost(url, method)) {
          const json = JSON.parse(this.responseText);
          const id = extractSubmissionId(json, null);
          if (id) {
            lastSubmissionId = id;
          }
        } else if (isSubmissionPoll(url, method)) {
          const urlId = extractSubmissionIdFromUrl(url);
          const subId = urlId || lastSubmissionId;
          const json = JSON.parse(this.responseText);
          const bodyId = extractSubmissionId(json, subId);
          tryDispatch(json, bodyId);
        }
      } catch (e) {}
    });
    return OrigSend.apply(this, [body]);
  };

  window.postMessage({ type: 'FA_HR_INTERCEPTOR_READY' }, '*');
  console.log('[FA HR] Interceptor ready.');
})();
