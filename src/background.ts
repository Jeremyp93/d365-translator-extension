/* eslint-disable @typescript-eslint/no-explicit-any */
chrome.runtime.onMessage.addListener((msg: any, _sender, _sendResponse) => {
  if (msg?.type === "OPEN_REPORT") {
    const { clientUrl, entity, attribute, labelId, formId, apiVersion } = msg.payload ?? {};
    if (!clientUrl || !entity || !attribute || !labelId || !formId || !apiVersion) return;

    const base = chrome.runtime.getURL("src/report/report.html");
    const qs =
      `?clientUrl=${encodeURIComponent(clientUrl)}` +
      `&entity=${encodeURIComponent(entity)}` +
      `&attribute=${encodeURIComponent(attribute)}` +
      `&labelId=${encodeURIComponent(labelId)}` +
      `&formId=${encodeURIComponent(formId)}` +
      `&apiVersion=${encodeURIComponent(apiVersion)}`;

    const url = `${base}#/report/field${qs}`;
    chrome.tabs.create({ url }).catch(() => {});
  } else if (msg?.type === "OPEN_FORM_REPORT") {
    const { clientUrl, entity, formId, apiVersion } = msg.payload ?? {};
    if (!clientUrl || !entity || !formId || !apiVersion) return;

    const base = chrome.runtime.getURL("src/report/report.html");
    const qs =
      `?clientUrl=${encodeURIComponent(clientUrl)}` +
      `&entity=${encodeURIComponent(entity)}` +
      `&formId=${encodeURIComponent(formId)}` +
      `&apiVersion=${encodeURIComponent(apiVersion)}`;

    const url = `${base}#/report/form${qs}`;
    chrome.tabs.create({ url }).catch(() => {});
  } else if (msg?.type === "OPEN_PLUGIN_REPORT") {
    const { clientUrl, apiVersion } = msg.payload ?? {};
    if (!clientUrl || !apiVersion) return;

    const base = chrome.runtime.getURL("src/report/report.html");
    const qs =
      `?clientUrl=${encodeURIComponent(clientUrl)}` +
      `&apiVersion=${encodeURIComponent(apiVersion)}`;

    const url = `${base}#/report/plugin-trace-logs${qs}`;
    chrome.tabs.create({ url }).catch(() => {});
  } else if (msg?.type === "OPEN_GLOBAL_OPTIONSETS") {
    const { clientUrl, apiVersion } = msg.payload ?? {};
    if (!clientUrl) return;

    const base = chrome.runtime.getURL("src/report/report.html");
    const qs = `?clientUrl=${encodeURIComponent(clientUrl)}${
      apiVersion ? `&apiVersion=${encodeURIComponent(apiVersion)}` : ""
    }`;

    const url = `${base}#/report/global-optionsets${qs}`;
    chrome.tabs.create({ url }).catch(() => {});
  }
});
