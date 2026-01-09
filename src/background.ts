/* eslint-disable @typescript-eslint/no-explicit-any */
chrome.runtime.onMessage.addListener((msg: any, sender, _sendResponse) => {
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
    if (!clientUrl || !apiVersion) return;

    const base = chrome.runtime.getURL("src/report/report.html");
    const qs =
      `?clientUrl=${encodeURIComponent(clientUrl)}` +
      (entity ? `&entity=${encodeURIComponent(entity)}` : "") +
      (formId ? `&formId=${encodeURIComponent(formId)}` : "") +
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
  } else if (msg?.type === "OPEN_ENTITY_BROWSER") {
    const { clientUrl, apiVersion } = msg.payload ?? {};
    if (!clientUrl) return;

    const base = chrome.runtime.getURL("src/report/report.html");
    const qs = `?clientUrl=${encodeURIComponent(clientUrl)}&apiVersion=${encodeURIComponent(apiVersion)}`;

    const url = `${base}#/report/entity-browser${qs}`;
    chrome.tabs.create({ url }).catch(() => {});
  } else if (msg?.type === "OPEN_AUDIT_HISTORY") {
    const { clientUrl, entityLogicalName, recordId, apiVersion } = msg.payload ?? {};
    const tabId = sender.tab?.id;
    if (!tabId || !clientUrl || !entityLogicalName || !recordId || !apiVersion) return;

    // Store context in session storage for the side panel to read
    // Note: Side panel will be opened by popup (which has user gesture context)
    chrome.storage.session.set({
      [`auditContext_${tabId}`]: {
        clientUrl,
        entityLogicalName,
        recordId,
        apiVersion,
        timestamp: Date.now()
      }
    }).catch(console.error);
  }
});
