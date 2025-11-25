/* ────────────────────────────────────────────────────────────────────────────
   Generic Web API helpers
   ──────────────────────────────────────────────────────────────────────────── */

export async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text().catch(() => '')}`);
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : null;
}

export async function fetchJsonNoCache(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text().catch(() => '')}`);
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : null;
}

export function toArray(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v.get === 'function') {
    try { return v.get(); } catch { /* ignore */ }
  }
  if (typeof v === 'object') return Object.values(v);
  return [];
}

/* ────────────────────────────────────────────────────────────────────────────
   IDs, utils, time
   ──────────────────────────────────────────────────────────────────────────── */

export function formatGuid(id: string): string {
  return id.replace(/[{}]/g, '').toLowerCase();
}

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/* ────────────────────────────────────────────────────────────────────────────
   Org, languages, publish
   ──────────────────────────────────────────────────────────────────────────── */

export async function getProvisionedLanguages(baseUrl: string): Promise<number[]> {
  const url = `${baseUrl}/api/data/v9.2/RetrieveProvisionedLanguages()`;
  const j = await fetchJson(url);
  const raw = Array.isArray((j as any)?.RetrieveProvisionedLanguages)
    ? (j as any).RetrieveProvisionedLanguages
    : Array.isArray((j as any)?.Value)
    ? (j as any).Value
    : [];
  return raw.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n));
}

export async function getOrgBaseLanguageCode(baseUrl: string): Promise<number> {
  const base = baseUrl.replace(/\/+$/, '');
  try {
    const j = await fetchJson(`${base}/api/data/v9.2/organizations?$select=languagecode&$top=1`);
    const row = j?.value?.[0];
    const n = Number(row?.languagecode);
    if (Number.isFinite(n) && n > 0) return n;
  } catch { /* ignore and use fallbacks */ }

  try {
    const langs = await getProvisionedLanguages(base);
    if (Array.isArray(langs) && langs.length) {
      return langs.includes(1033) ? 1033 : langs[0];
    }
  } catch { /* ignore */ }

  return 1033;
}

export async function publishEntityViaWebApi(baseUrl: string, entityLogicalName: string): Promise<void> {
  const url = `${baseUrl}/api/data/v9.2/PublishXml`;
  const parameterXml = `<importexportxml><entities><entity>${entityLogicalName}</entity></entities></importexportxml>`;
  await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ParameterXml: parameterXml }),
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   User + UI language (for form label tricks)
   ──────────────────────────────────────────────────────────────────────────── */

export async function whoAmI(baseUrl: string): Promise<string> {
  const j = await fetchJson(`${baseUrl}/api/data/v9.2/WhoAmI()`);
  const id = j?.UserId;
  if (!id) throw new Error('WhoAmI failed to return UserId');
  return formatGuid(String(id));
}

export async function getUserSettingsRow(baseUrl: string, systemUserId: string): Promise<{
  systemuserid?: string;
  uilanguageid: number;
  helplanguageid: number;
  localeid: number;
}> {
  const url =
    `${baseUrl}/api/data/v9.2/usersettingscollection(${formatGuid(systemUserId)})` +
    `?$select=uilanguageid,helplanguageid,localeid,systemuserid`;
  const j = await fetchJson(url);
  if (!j?.systemuserid) throw new Error('Could not resolve usersettings row for current user.');
  return {
    systemuserid: String(j.systemuserid),
    uilanguageid: Number(j.uilanguageid),
    helplanguageid: Number(j.helplanguageid),
    localeid: Number(j.localeid),
  };
}

export async function setUserUiLanguage(baseUrl: string, systemUserId: string, lcid: number): Promise<void> {
  const url = `${baseUrl}/api/data/v9.2/usersettingscollection(${formatGuid(systemUserId)})`;
  await fetchJson(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ uilanguageid: lcid, helplanguageid: lcid, localeid: lcid }),
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Form XML reads/writes (shared)
   ──────────────────────────────────────────────────────────────────────────── */

export async function getFormXml(baseUrl: string, formId: string): Promise<string> {
  const url = `${baseUrl}/api/data/v9.2/systemforms(${formatGuid(formId)})?$select=formxml`;
  const j = await fetchJsonNoCache(url);
  const xml = j?.formxml || j?.FormXml || '';
  if (!xml) throw new Error('systemform.formxml not found');
  return String(xml);
}

export async function getFormXmlWithEtag(
  baseUrl: string,
  formId: string
): Promise<{ xml: string; etag: string | null }> {
  const url = `${baseUrl}/api/data/v9.2/systemforms(${formatGuid(formId)})?$select=formxml`;
  const r = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text().catch(() => '')}`);
  const etag = r.headers.get('ETag');
  const j = await r.json();
  const xml = j?.formxml || j?.FormXml || '';
  if (!xml) throw new Error('systemform.formxml not found');
  return { xml: String(xml), etag };
}

export async function patchFormXmlStrict(
  baseUrl: string,
  formId: string,
  formxml: string,
  etag?: string
): Promise<void> {
  const url = `${baseUrl}/api/data/v9.2/systemforms(${formatGuid(formId)})`;
  await fetchJson(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(etag ? { 'If-Match': etag } : {}),
    },
    body: JSON.stringify({ formxml }),
  });
}

/** Polls until the language switch “applies” (best-effort). */
export async function waitForLanguageToApply(
  baseUrl: string,
  formId: string,
  timeoutMs = 5000,
  intervalMs = 400
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const xml = await getFormXml(baseUrl, formId);
      if (xml && xml.length > 0) return;
    } catch { /* transient */ }
    await sleep(intervalMs);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   SOAP plumbing (generic) + attribute metadata helper
   ──────────────────────────────────────────────────────────────────────────── */

export function soapUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '') + '/XRMServices/2011/Organization.svc/web';
}

export function escXml(s: string): string {
  return String(s ?? '').replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!)
  );
}

export async function soapExecute(baseUrl: string, envelope: string): Promise<Document> {
  const r = await fetch(soapUrl(baseUrl), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute',
    },
    body: envelope,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`SOAP ${r.status}: ${text}`);
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const fault = xml.getElementsByTagName('s:Fault')[0] || xml.getElementsByTagName('Fault')[0];
  if (fault) {
    const msg =
      fault.getElementsByTagName('faultstring')[0]?.textContent ||
      fault.getElementsByTagName('faultcode')[0]?.textContent ||
      'Unknown SOAP fault';
    throw new Error(`SOAP Fault: ${msg}`);
  }
  return xml;
}

/** Resolve MetadataId + concrete SOAP type name (e.g., StringAttributeMetadata). */
export async function getAttributeSoapBasics(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<{ metadataId: string; soapTypeName: string }> {
  const url =
    `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=MetadataId`;
  const j = await fetchJson(url);
  const metadataId = (j as any)?.MetadataId as string | undefined;
  const odataType = (j as any)?.['@odata.type'] as string | undefined;
  if (!metadataId || !odataType) throw new Error('Could not resolve attribute MetadataId/@odata.type');
  const soapTypeName = odataType.match(/#Microsoft\.Dynamics\.CRM\.(.+)$/)?.[1] || 'AttributeMetadata';
  return { metadataId, soapTypeName };
}

/* ────────────────────────────────────────────────────────────────────────────
   Binary helpers (for translation zips, etc.)
   ──────────────────────────────────────────────────────────────────────────── */

/** Safe base64 → Uint8Array (works in browser, avoids SharedArrayBuffer typing issues). */
export function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}
