/* eslint-disable @typescript-eslint/no-explicit-any */
chrome.runtime.onMessage.addListener((msg: any, _sender, _sendResponse) => {
  if (msg?.type === 'OPEN_REPORT') {
    const { clientUrl, entity, attribute, labelId, formId } = msg.payload ?? {};
    if (!clientUrl || !entity || !attribute || !labelId || !formId) return;

    const url =
      `${chrome.runtime.getURL('src/report/report.html')}` +
      `?clientUrl=${encodeURIComponent(clientUrl)}` +
      `&entity=${encodeURIComponent(entity)}` +
      `&attribute=${encodeURIComponent(attribute)}` +
      `&labelId=${encodeURIComponent(labelId)}` +
      `&formId=${encodeURIComponent(formId)}`;

    chrome.tabs.create({ url }).catch(() => { /* ignore */ });
  }
});
