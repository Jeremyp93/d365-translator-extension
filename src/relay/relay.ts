/* eslint-disable @typescript-eslint/no-explicit-any */
// Runs in the content-script world (has chrome.runtime). Forwards window messages to background.

(function () {
  if ((window as any).__d365RelayInstalled) return;
  (window as any).__d365RelayInstalled = true;

  window.addEventListener('message', (ev: MessageEvent) => {
    const d = ev.data as any;
    if (!d || d.__d365x__ !== true) return;

    if (d.type === 'OPEN_REPORT') {
      chrome.runtime.sendMessage({
        type: 'OPEN_REPORT',
        payload: d.payload
      });
    }
    if (d.type === 'OPEN_FORM_REPORT') {
      chrome.runtime.sendMessage({
        type: 'OPEN_FORM_REPORT',
        payload: d.payload
      });
    }
  });
})();
