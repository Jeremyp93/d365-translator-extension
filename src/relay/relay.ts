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
    if (d.type === 'OPEN_PLUGIN_REPORT') {
      chrome.runtime.sendMessage({
        type: 'OPEN_PLUGIN_REPORT',
        payload: d.payload
      });
    }
    if (d.type === 'OPEN_GLOBAL_OPTIONSETS') {
      chrome.runtime.sendMessage({
        type: 'OPEN_GLOBAL_OPTIONSETS',
        payload: d.payload
      });
    }
    if (d.type === 'OPEN_ENTITY_BROWSER') {
      chrome.runtime.sendMessage({
        type: 'OPEN_ENTITY_BROWSER',
        payload: d.payload
      });
    }
    if (d.type === 'OPEN_AUDIT_HISTORY') {
      chrome.runtime.sendMessage({
        type: 'OPEN_AUDIT_HISTORY',
        payload: d.payload
      });
    }
    if (d.type === 'OPEN_FIELD_MODAL') {
      // Build iframe URL for field modal
      const params = new URLSearchParams({
        clientUrl: d.payload.clientUrl || '',
        entity: d.payload.entity || '',
        attribute: d.payload.attribute || '',
        formId: d.payload.formId || '',
        labelId: d.payload.labelId || '',
        apiVersion: d.payload.apiVersion || 'v9.1'
      });
      const iframeUrl = chrome.runtime.getURL(`src/modal/modal.html?${params.toString()}`);

      // Post iframe URL back to MAIN world
      window.postMessage({
        __d365x__: true,
        type: 'FIELD_MODAL_URL',
        payload: { url: iframeUrl }
      }, '*');
    }
  });
})();
