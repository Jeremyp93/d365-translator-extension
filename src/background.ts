/* eslint-disable @typescript-eslint/no-explicit-any */
chrome.runtime.onMessage.addListener((msg: any, _sender, _sendResponse) => {
  if (msg?.type === 'OPEN_REPORT') {
    const { clientUrl, entity, attribute } = msg.payload ?? {};
    if (!clientUrl || !entity || !attribute) return;

    const url =
      `${chrome.runtime.getURL('src/report/report.html')}` +
      `?clientUrl=${encodeURIComponent(clientUrl)}` +
      `&entity=${encodeURIComponent(entity)}` +
      `&attribute=${encodeURIComponent(attribute)}`;

    chrome.tabs.create({ url }).catch(() => { /* ignore */ });
  }
});
