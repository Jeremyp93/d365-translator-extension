/* ────────────────────────────────────────────────────────────────────────────
   Generic Web API helpers
   ──────────────────────────────────────────────────────────────────────────── */

import { DEFAULT_BASE_LANGUAGE } from '../config/constants';
import { buildApiUrl, buildActionUrl, buildFormUrl, buildUserSettingsUrl, buildAttributeUrl } from '../utils/urlBuilders';

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

export async function getProvisionedLanguages(baseUrl: string, apiVersion: string = 'v9.2'): Promise<number[]> {
  const url = buildActionUrl({
    baseUrl,
    apiVersion,
    actionName: 'RetrieveProvisionedLanguages'
  });
  const j = await fetchJson(url);
  const raw = Array.isArray((j as any)?.RetrieveProvisionedLanguages)
    ? (j as any).RetrieveProvisionedLanguages
    : Array.isArray((j as any)?.Value)
    ? (j as any).Value
    : [];
  return raw.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n));
}

export async function getOrgBaseLanguageCode(baseUrl: string, apiVersion: string = 'v9.2'): Promise<number> {
  const base = baseUrl.replace(/\/+$/, '');
  try {
    const api = buildApiUrl(base, apiVersion);
    const j = await fetchJson(`${api}/organizations?$select=languagecode&$top=1`);
    const row = j?.value?.[0];
    const n = Number(row?.languagecode);
    if (Number.isFinite(n) && n > 0) return n;
  } catch { /* ignore and use fallbacks */ }

  try {
    const langs = await getProvisionedLanguages(base, apiVersion);
    if (Array.isArray(langs) && langs.length) {
      return langs.includes(DEFAULT_BASE_LANGUAGE) ? DEFAULT_BASE_LANGUAGE : langs[0];
    }
  } catch { /* ignore */ }

  return DEFAULT_BASE_LANGUAGE;
}

export async function publishEntityViaWebApi(baseUrl: string, entityLogicalName: string, apiVersion: string = 'v9.2'): Promise<void> {
  const url = buildActionUrl({
    baseUrl,
    apiVersion,
    actionName: 'PublishXml'
  });
  const parameterXml = `<importexportxml><entities><entity>${entityLogicalName}</entity></entities></importexportxml>`;
  await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ParameterXml: parameterXml }),
  });
}

/**
 * Publish multiple entities in a single PublishXml call.
 * More efficient than calling publishEntityViaWebApi multiple times.
 *
 * @param baseUrl - Organization base URL
 * @param entityNames - Array of entity logical names to publish
 * @param apiVersion - API version (defaults to v9.2)
 */
export async function publishMultipleEntities(
  baseUrl: string,
  entityNames: string[],
  apiVersion: string = 'v9.2'
): Promise<void> {
  if (entityNames.length === 0) return;

  // Build XML with multiple entity tags
  const entities = entityNames.map((e) => `<entity>${escXml(e)}</entity>`).join('');
  const parameterXml = `<importexportxml><entities>${entities}</entities></importexportxml>`;

  const url = buildActionUrl({
    baseUrl,
    apiVersion,
    actionName: 'PublishXml'
  });
  await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ParameterXml: parameterXml }),
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   User + UI language (for form label tricks)
   ──────────────────────────────────────────────────────────────────────────── */

export async function whoAmI(baseUrl: string, apiVersion: string = 'v9.2'): Promise<string> {
  const url = buildActionUrl({
    baseUrl,
    apiVersion,
    actionName: 'WhoAmI'
  });
  const j = await fetchJson(url);
  const id = j?.UserId;
  if (!id) throw new Error('WhoAmI failed to return UserId');
  return formatGuid(String(id));
}

export async function getUserSettingsRow(baseUrl: string, systemUserId: string, apiVersion: string = 'v9.2'): Promise<{
  systemuserid?: string;
  uilanguageid: number;
  helplanguageid: number;
  localeid: number;
}> {
  const url = buildUserSettingsUrl({
    baseUrl,
    apiVersion,
    systemUserId,
    select: ['uilanguageid', 'helplanguageid', 'localeid', 'systemuserid']
  });
  const j = await fetchJson(url);
  if (!j?.systemuserid) throw new Error('Could not resolve usersettings row for current user.');
  return {
    systemuserid: String(j.systemuserid),
    uilanguageid: Number(j.uilanguageid),
    helplanguageid: Number(j.helplanguageid),
    localeid: Number(j.localeid),
  };
}

export async function setUserUiLanguage(baseUrl: string, systemUserId: string, lcid: number, apiVersion: string = 'v9.2'): Promise<void> {
  const url = buildUserSettingsUrl({
    baseUrl,
    apiVersion,
    systemUserId
  });
  await fetchJson(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ uilanguageid: lcid, helplanguageid: lcid, localeid: lcid }),
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Form XML reads/writes (shared)
   ──────────────────────────────────────────────────────────────────────────── */

export type SystemForm = {
  formid: string;
  name: string;
  description?: string;
  type: number; // 2 = Main, 7 = Quick Create, 8 = Quick View, etc.
  objecttypecode: string;
  iscustomizable?: {
    Value: boolean;
    CanBeChanged: boolean;
    ManagedPropertyLogicalName?: string;
  };
  ismanaged?: boolean;
  canbedeleted?: {
    Value: boolean;
    CanBeChanged?: boolean;
    ManagedPropertyLogicalName?: string;
  };
};

export async function getFormXml(baseUrl: string, formId: string): Promise<string> {
  const url = buildFormUrl({
    baseUrl,
    apiVersion: 'v9.2',
    formId,
    select: ['formxml']
  });
  const j = await fetchJsonNoCache(url);
  const xml = j?.formxml || j?.FormXml || '';
  if (!xml) throw new Error('systemform.formxml not found');
  return String(xml);
}

export async function getFormsForEntity(
  baseUrl: string,
  entityLogicalName: string,
  apiVersion: string = 'v9.2'
): Promise<SystemForm[]> {
  // Include multiple form types: Main (2), Quick Create (6), Quick View (7), Card (11), Main Interactive (12)
  const url = `${baseUrl}/api/data/${apiVersion}/systemforms?$select=formid,name,description,type,objecttypecode,iscustomizable,ismanaged,canbedeleted&$filter=objecttypecode eq '${entityLogicalName}' and (type eq 2 or type eq 6 or type eq 7 or type eq 11 or type eq 12)&$orderby=type asc,name asc`;
  const j = await fetchJson(url);
  const forms = j?.value || [];
  return forms.map((f: any) => ({
    formid: f.formid,
    name: f.name || 'Unnamed Form',
    description: f.description,
    type: f.type,
    objecttypecode: f.objecttypecode,
    iscustomizable: f.iscustomizable,
    ismanaged: f.ismanaged,
    canbedeleted: f.canbedeleted,
  }));
}

/**
 * Checks if a form is customizable based on its metadata.
 * A form is customizable if iscustomizable.Value is true.
 *
 * Note: We only check isCustomizable, not isManaged, because forms from managed solutions
 * can be customized if they are added to an unmanaged solution.
 */
export function isFormCustomizable(form: SystemForm | undefined | null): boolean {
  if (!form) return false;

  const isCustomizableValue = form.iscustomizable?.Value ?? true; // Default to true if not set

  return isCustomizableValue;
}

export async function getFormXmlWithEtag(
  baseUrl: string,
  formId: string
): Promise<{ xml: string; etag: string | null }> {
  const url = buildFormUrl({
    baseUrl,
    apiVersion: 'v9.2',
    formId,
    select: ['formxml']
  });
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
  const url = buildFormUrl({
    baseUrl,
    apiVersion: 'v9.2',
    formId
  });
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
   Envirionment variable helpers
   ──────────────────────────────────────────────────────────────────────────── */

export async function getEnvironmentVariableValue(
  baseUrl: string,
  apiVersion: string = 'v9.2',
  schemaName: string
): Promise<string | null> {
  // RetrieveEnvironmentVariableValue uses special @parameter notation
  // URL format: /api/data/v9.2/RetrieveEnvironmentVariableValue(DefinitionSchemaName=@DefinitionSchemaName)?@DefinitionSchemaName='value'
  const api = buildApiUrl(baseUrl, apiVersion);
  const encodedValue = encodeURIComponent(`'${schemaName}'`);
  const url = `${api}/RetrieveEnvironmentVariableValue(DefinitionSchemaName=@DefinitionSchemaName)?@DefinitionSchemaName=${encodedValue}`;

  const j = await fetchJson(url);
  return j?.Value ?? null;
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
  const url = buildAttributeUrl({
    baseUrl,
    apiVersion: 'v9.2',
    entityLogicalName,
    attributeLogicalName,
    select: ['MetadataId']
  });
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
