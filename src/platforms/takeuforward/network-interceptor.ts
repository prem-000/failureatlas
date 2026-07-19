// Take U Forward Network Interceptor
// Runs in the main page context to intercept API calls

(function () {
  function extractSlug(): string {
    const problemMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
    const contestMatch = window.location.pathname.match(/\/contest\/[^/]+\/problems\/([^/]+)/);
    const match = problemMatch || contestMatch;
    return match ? match[1] : '';
  }

  // 1. Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const requestInfo = args[0];
    let url = '';
    if (typeof requestInfo === 'string') {
      url = requestInfo;
    } else if (requestInfo instanceof URL) {
      url = requestInfo.href;
    } else if (requestInfo && typeof requestInfo === 'object' && 'url' in requestInfo) {
      url = (requestInfo as any).url;
    }

    const isRun = url.includes('/run');
    const isCheckRun = url.includes('/check-run');

    if (!isRun && !isCheckRun) {
      return originalFetch.apply(this, args);
    }

    const response = await originalFetch.apply(this, args);

    try {
      const clonedResponse = response.clone();
      const json = await clonedResponse.json();

      if (isRun && json) {
        const submissionId = json.submission_id || json.data?.submission_id || json.submissionId || json.data?.submissionId;
        if (submissionId) {
          (window as any).__fa_last_submission_id = submissionId;
        }
      } else if (isCheckRun && json) {
        let submissionId = '';
        try {
          const parsedUrl = new URL(url, window.location.origin);
          submissionId = parsedUrl.searchParams.get('submission_id') || '';
        } catch (e) {}

        if (!submissionId) {
          submissionId = (window as any).__fa_last_submission_id || '';
        }

        const data = json.data;
        if (data && data.completed === true) {
          window.postMessage({
            type: 'FA_TUF_RESULT',
            submissionId,
            result: json,
            problemSlug: extractSlug(),
            timestamp: Date.now()
          }, '*');
        }
      }
    } catch (e) {
      // Avoid throwing to not break the page's original fetch
    }

    return response;
  };

  // 2. Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: any, url: any, ...rest: any[]) {
    (this as any).__fa_url = url;
    (this as any).__fa_method = method;
    return originalOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function (body: any) {
    this.addEventListener('load', function () {
      try {
        const url = (this as any).__fa_url || '';
        const method = (this as any).__fa_method || '';
        const isRun = url.includes('/run') && method.toUpperCase() === 'POST';
        const isCheckRun = url.includes('/check-run') && method.toUpperCase() === 'GET';

        if (isRun || isCheckRun) {
          const json = JSON.parse(this.responseText);
          if (isRun && json) {
            const submissionId = json.submission_id || json.data?.submission_id || json.submissionId || json.data?.submissionId;
            if (submissionId) {
              (window as any).__fa_last_submission_id = submissionId;
            }
          } else if (isCheckRun && json) {
            let submissionId = '';
            try {
              const parsedUrl = new URL(url, window.location.origin);
              submissionId = parsedUrl.searchParams.get('submission_id') || '';
            } catch (e) {}

            if (!submissionId) {
              submissionId = (window as any).__fa_last_submission_id || '';
            }

            const data = json.data;
            if (data && data.completed === true) {
              window.postMessage({
                type: 'FA_TUF_RESULT',
                submissionId,
                result: json,
                problemSlug: extractSlug(),
                timestamp: Date.now()
              }, '*');
            }
          }
        }
      } catch (e) {
        // Ignore errors to not break original XHR behavior
      }
    });
    return originalSend.apply(this, [body]);
  };
})();
