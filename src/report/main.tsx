import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

/* ───────────── Types & Query Params ───────────── */

interface Label { languageCode: number; label: string }
type Editable = Record<number, string>;

const qs = new URLSearchParams(location.search);
const clientUrl = (qs.get('clientUrl') || '').replace(/\/+$/, '');
const entity = qs.get('entity') || '';
const attribute = qs.get('attribute') || '';
const formId = (qs.get('formId') || '').replace(/[{}]/g, '').toLowerCase(); // <- new (needed for form labels)
const labelId = (qs.get('labelId') || '').replace(/[{}]/g, '').toLowerCase();

/* ───────────── React App ───────────── */

function App(): JSX.Element {
  const [entityLabels, setEntityLabels] = useState<Label[] | null>(null);
  const [langs, setLangs] = useState<number[] | null>(null);
  const [values, setValues] = useState<Editable>({});            // entity attribute values
  const [formValues, setFormValues] = useState<Editable>({});     // form label values (per LCID)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const langList = useMemo(() => (langs ?? []).slice().sort((a, b) => a - b), [langs]);

  // Initial load for entity DisplayName editor
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setInfo('Loading…');

        const [labels, provisioned] = await Promise.all([
          getAttributeLabelTranslations(clientUrl, entity, attribute),
          getProvisionedLanguages(clientUrl),
        ]);

        const fallbackLangs = Array.from(
          new Set((labels ?? []).map((l) => Number(l.languageCode)).filter((n) => Number.isFinite(n)))
        );
        const finalLangs = (provisioned && provisioned.length ? provisioned : fallbackLangs).sort((a, b) => a - b);

        setEntityLabels(labels ?? []);
        setLangs(finalLangs);

        const map: Editable = {};
        finalLangs.forEach((lcid) => {
          const hit = labels.find((l) => Number(l.languageCode) === lcid);
          map[lcid] = hit?.label ?? '';
        });
        setValues(map);

        setInfo(null);
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setInfo(null);
      }
    })();
  }, []);

  const onChange = (lcid: number, v: string) => {
    setValues((prev) => ({ ...prev, [lcid]: v }));
  };
  const onFormChange = (lcid: number, v: string) => {
    setFormValues((prev) => ({ ...prev, [lcid]: v }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setInfo('Saving…');

      const labels = langList.map((lcid) => ({ LanguageCode: lcid, Label: values[lcid] ?? '' }));

      // SOAP update (robust) + publish
      await updateAttributeLabelsViaSoap(clientUrl, entity, attribute, labels);
      setInfo('Publishing…');
      await publishEntityViaWebApi(clientUrl, entity);

      setInfo('Saved & published successfully. If you still see old text, hard refresh the app (Ctrl/Cmd+Shift+R).');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const onVerify = async () => {
    try {
      const labels = await verifyAttributeLabels(clientUrl, entity, attribute);
      // eslint-disable-next-line no-console
      console.log('[verify] DisplayName.LocalizedLabels:', labels);
      alert('Check console for DisplayName labels (verify).');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  // ───── New: Form Labels (no-solution) ─────

  const onLoadFormLabels = async () => {
    try {
      if (!formId) throw new Error('Missing formId in query string (?formId=<guid>).');
      if (!langs?.length) throw new Error('Provisioned languages not loaded yet.');
      setInfo('Reading form labels for all languages…');
      setError(null);

      const results = await readFormFieldLabelsAllLcids(clientUrl, formId, attribute, langs);
      const newValues: Record<number, string> = {};
      for (const { lcid, label } of results) newValues[lcid] = label ?? '';
      setFormValues(newValues);

      setInfo('Form labels loaded.');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setInfo(null);
    }
  };

  const onSaveFormLabels = async () => {
    try {
      if (!formId) throw new Error('Missing formId in query string (?formId=<guid>).');
      setInfo('Saving form labels per language…');
      setError(null);

      // Only update LCIDs that are in the current formValues map
      for (const lcid of Object.keys(formValues).map(Number)) {
        await saveFormFieldLabelForLcid(clientUrl, formId, attribute, lcid, formValues[lcid] ?? '');
      }

      setInfo('Form labels saved. If the app still shows old text, hard refresh (Ctrl/Cmd+Shift+R).');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setInfo(null);
    }
  };

  return (
    <div style={page}>
      <h1 style={h1}>Translations editor</h1>
      <div style={{ margin: '8px 0 4px' }}>
        Entity: <code>{entity}</code> • Attribute: <code>{attribute}</code> • FormId: <code>{formId || '(none)'}</code>
      </div>
      <div style={{ color: '#6a737d', marginBottom: 8, fontSize: 12 }}>
        langs: {langs?.length ?? 0} • labels: {entityLabels?.length ?? 0}
      </div>

      {error && <div style={errorBox}>Error: {error}</div>}
      {info && !error && <div style={infoBox}>{info}</div>}

      {/* ENTITY DISPLAYNAME */}
      <section>
        <h2 style={h2}>DisplayName labels (Entity metadata)</h2>
        {langs && entityLabels ? (
          <table style={tbl}>
            <thead>
              <tr>
                <th style={th}>LCID</th>
                <th style={th}>Label</th>
              </tr>
            </thead>
            <tbody>
              {langList.map((lcid) => (
                <tr key={lcid}>
                  <td style={td}>{lcid}</td>
                  <td style={td}>
                    <input
                      value={values[lcid] ?? ''}
                      onChange={(e) => onChange(lcid, e.target.value)}
                      placeholder="(empty)"
                      style={inp}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>Loading…</div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={onSave} disabled={saving || !langs} style={btnPrimary}>
            {saving ? 'Saving…' : 'Save & Publish'}
          </button>
          <button onClick={onVerify} style={btnGhost}>Verify</button>
        </div>
      </section>

      {/* FORM LABELS */}
      <section>
        <h2 style={h2}>Form labels (no solution, per LCID)</h2>
        {!formId && (
          <div style={infoBox}>
            Add <code>?formId=&lt;guid&gt;</code> to the URL to enable this section.
          </div>
        )}
        {langs ? (
          <table style={tbl}>
            <thead>
              <tr>
                <th style={th}>LCID</th>
                <th style={th}>Label</th>
              </tr>
            </thead>
            <tbody>
              {langList.map((lcid) => (
                <tr key={lcid}>
                  <td style={td}>{lcid}</td>
                  <td style={td}>
                    <input
                      value={formValues[lcid] ?? ''}
                      onChange={(e) => onFormChange(lcid, e.target.value)}
                      placeholder="(empty)"
                      style={inp}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>Loading languages…</div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={onLoadFormLabels} disabled={!langs || !formId} style={btnGhost}>
            Load Form Labels (all LCIDs)
          </button>
          <button onClick={onSaveFormLabels} disabled={!langs || !formId} style={btnPrimary}>
            Save Form Labels (all LCIDs)
          </button>
        </div>
      </section>
    </div>
  );
}

/* ───────────── Data helpers (Web API) ───────────── */

async function fetchJson(url: string, init?: RequestInit) {
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
function toArray(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v.get === 'function') {
    try {
      return v.get();
    } catch {
      /* ignore */
    }
  }
  if (typeof v === 'object') return Object.values(v);
  return [];
}

async function getAttributeLabelTranslations(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<Label[]> {
  const url =
    `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=DisplayName`;
  const j = await fetchJson(url);
  const arr = toArray(j?.DisplayName?.LocalizedLabels);
  return arr.map((l: any) => ({ languageCode: Number(l.LanguageCode), label: String(l.Label ?? '') }));
}

async function getProvisionedLanguages(baseUrl: string): Promise<number[]> {
  const url = `${baseUrl}/api/data/v9.2/RetrieveProvisionedLanguages()`;
  const j = await fetchJson(url);
  const raw = Array.isArray((j as any)?.value) ? (j as any).value : Array.isArray((j as any)?.Values) ? (j as any).Values : [];
  return raw.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n));
}

async function verifyAttributeLabels(baseUrl: string, entityLogicalName: string, attributeLogicalName: string) {
  const url =
    `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=DisplayName`;
  const j = await fetchJson(url);
  const labels = (j?.DisplayName?.LocalizedLabels ?? []).map((l: any) => ({
    lcid: l.LanguageCode,
    label: l.Label,
  }));
  return labels;
}

async function getCurrentDisplayNameLabels(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<Record<number, string>> {
  const url =
    `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=DisplayName`;
  const j = await fetchJson(url);
  const arr = toArray(j?.DisplayName?.LocalizedLabels);
  const map: Record<number, string> = {};
  for (const l of arr) {
    const code = Number((l as any)?.LanguageCode);
    if (Number.isFinite(code)) map[code] = String((l as any)?.Label ?? '');
  }
  return map;
}

// Replace your getOrgBaseLanguageCode() with this
async function getOrgBaseLanguageCode(baseUrl: string): Promise<number> {
  const base = baseUrl.replace(/\/+$/, '');

  // 1) Preferred: organization.languagecode (base org language)
  try {
    const j = await fetchJson(`${base}/api/data/v9.2/organizations?$select=languagecode&$top=1`);
    const row = j?.value?.[0];
    const n = Number(row?.languagecode);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore and try fallbacks */
  }

  // 2) Fallback: provisioned languages → prefer 1033 if present, else first
  try {
    const langs = await getProvisionedLanguages(base);
    if (Array.isArray(langs) && langs.length) {
      if (langs.includes(1033)) return 1033;
      return langs[0];
    }
  } catch {
    /* ignore */
  }

  // 3) Last resort: default to 1033
  return 1033;
}

async function publishEntityViaWebApi(baseUrl: string, entityLogicalName: string): Promise<void> {
  const url = `${baseUrl}/api/data/v9.2/PublishXml`;
  const parameterXml = `<importexportxml><entities><entity>${entityLogicalName}</entity></entities></importexportxml>`;
  await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ParameterXml: parameterXml }),
  });
}

/* ───────────── No-solution Form Labels helpers ───────────── */

async function fetchJsonNoCache(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    credentials: 'include',
    cache: 'no-store', // tell the browser
    headers: {
      'Accept': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text().catch(() => '')}`);
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : null;
}

function formatGuidFilter(id: string): string {
  const clean = id.replace(/[{}]/g, '').toLowerCase();
  return `${clean}`;
}

/** WhoAmI → SystemUserId */
async function whoAmI(baseUrl: string): Promise<string> {
  const j = await fetchJson(`${baseUrl}/api/data/v9.2/WhoAmI()`);
  const id = j?.UserId;
  if (!id) throw new Error('WhoAmI failed to return UserId');
  return String(id).replace(/[{}]/g, '').toLowerCase();
}

/** usersettings row for current user */
async function getUserSettingsRow(baseUrl: string, systemUserId: string): Promise<{
  uilanguageid: number; helplanguageid: number; localeid: number;
}> {
  const url =
    `${baseUrl}/api/data/v9.2/usersettingscollection(${formatGuidFilter(systemUserId)})` +
    `?$select=uilanguageid,helplanguageid,localeid`;
  const j = await fetchJson(url);
  if (!j?.systemuserid) throw new Error('Could not resolve usersettings row for current user.');
  return {
    uilanguageid: Number(j.uilanguageid),
    helplanguageid: Number(j.helplanguageid),
    localeid: Number(j.localeid),
  };
}

async function setUserUiLanguage(baseUrl: string, systemUserId: string, lcid: number): Promise<void> {
  const url = `${baseUrl}/api/data/v9.2/usersettingscollection(${systemUserId})`;
  await fetchJson(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ uilanguageid: lcid, helplanguageid: lcid, localeid: lcid }),
  });
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function getFormXml(baseUrl: string, formId: string): Promise<string> {
  const url = `${baseUrl}/api/data/v9.2/systemforms(${formatGuid(formId)})?$select=formxml`;
  const j = await fetchJsonNoCache(url);
  const xml = j?.formxml || j?.FormXml || '';
  if (!xml) throw new Error('systemform.formxml not found');
  return String(xml);
}

async function getFormXmlWithEtag(baseUrl: string, formId: string): Promise<{ xml: string; etag: string | null }> {
  const url = `${baseUrl}/api/data/v9.2/systemforms(${formatGuid(formId)})?$select=formxml`;
  const r = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text().catch(()=> '')}`);
  const etag = r.headers.get('ETag');
  const j = await r.json();
  return { xml: j?.formxml || j?.FormXml || '', etag };
  
}
async function patchFormXmlStrict(baseUrl: string, formId: string, formxml: string, etag?: string): Promise<void> {
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

function formatGuid(id: string): string {
  const clean = id.replace(/[{}]/g, '').toLowerCase();
  return clean.startsWith('guid\'') ? clean : clean;
}

/** Wait until the language switch “applies” (best effort) */
async function waitForLanguageToApply(baseUrl: string, formId: string, timeoutMs = 5000, intervalMs = 400): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const xml = await getFormXml(baseUrl, formId);
      if (xml && xml.length > 0) return;
    } catch { /* ignore transient */ }
    await sleep(intervalMs);
  }
}

/** Find the first <cell> that hosts our attribute’s control */
function findCellsForAttribute(doc: Document, attributeLogicalName: string): Element[] {
  const cells: Element[] = [];
  const cellEls = Array.from(doc.getElementsByTagName('cell'));
  for (const cell of cellEls) {
    const controls = Array.from(cell.getElementsByTagName('control'));
    const hasMatch = controls.some((c) => (c.getAttribute('datafieldname') || '').toLowerCase() === attributeLogicalName.toLowerCase());
    if (hasMatch) cells.push(cell);
  }
  return cells;
}

function readCurrentLcidFormLabel(
  formxml: string,
  attributeLogicalName: string,
  labelId: string
): string {
  const doc = new DOMParser().parseFromString(formxml, 'text/xml');
  const cells = findCellsForAttribute(doc, attributeLogicalName);

  const wanted = (labelId || '').replace(/[{}]/g, '').toLowerCase();
  if (!wanted) return '';

  for (const cell of cells) {
    if (cell.id.replace(/[{}]/g, '').toLowerCase() !== wanted) continue;
    const labelsNode = cell.getElementsByTagName('labels')[0];
    if (!labelsNode) continue;

    const labelEls = labelsNode.getElementsByTagName('label');
    for (const lbl of Array.from(labelEls)) {
        return lbl.getAttribute('description') || '';
    }
  }
  return '';
}

function setCurrentLcidFormLabel(
  formxml: string,
  attributeLogicalName: string,
  newText: string,
  labelId: string
): string {
  const doc = new DOMParser().parseFromString(formxml, 'text/xml');
  const cells = findCellsForAttribute(doc, attributeLogicalName);

  const wanted = (labelId || '').replace(/[{}]/g, '').toLowerCase();
  if (!wanted) return formxml; // nothing to do

  for (const cell of cells) {
    if (cell.id.replace(/[{}]/g, '').toLowerCase() !== wanted) continue;
    const labels = cell.getElementsByTagName('labels')[0];
    if (!labels) continue;

    const labelEls = Array.from(labels.getElementsByTagName('label'));
    for (const lbl of labelEls) {
        lbl.setAttribute('description', newText ?? '');
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

/**
 * Read labels for ALL requested LCIDs by temporarily switching the current user’s UI language.
 * Returns a flat list: [{ lcid, label }]
 */
async function readFormFieldLabelsAllLcids(
  baseUrl: string,
  formId: string,
  attributeLogicalName: string,
  lcids: number[]
): Promise<Array<{ lcid: number; label: string }>> {
  const userId = await whoAmI(baseUrl);
  const us = await getUserSettingsRow(baseUrl, userId);
  const original = { uilanguageid: us.uilanguageid, helplanguageid: us.helplanguageid, localeid: us.localeid };

  const out: Array<{ lcid: number; label: string }> = [];

  try {
    for (const lcid of lcids) {
      await setUserUiLanguage(baseUrl, userId, lcid);
      await waitForLanguageToApply(baseUrl, formId);
      const xml = await getFormXml(baseUrl, formId);
      const val = readCurrentLcidFormLabel(xml, attributeLogicalName, labelId);
      out.push({ lcid, label: val });
    }
  } finally {
    try { await setUserUiLanguage(baseUrl, userId, original.uilanguageid); } catch {}
  }
  return out;
}

/**
 * Save one LCID’s text by switching the user to that LCID, modifying the formxml, then PATCHing it back.
 */
async function saveFormFieldLabelForLcid(
  baseUrl: string,
  formId: string,
  attributeLogicalName: string,
  lcid: number,
  newText: string
): Promise<void> {
  const userId = await whoAmI(baseUrl);
  const us = await getUserSettingsRow(baseUrl, userId);
  const original = { uilanguageid: us.uilanguageid };

  try {
    await setUserUiLanguage(baseUrl, userId, lcid);
    await waitForLanguageToApply(baseUrl, formId);
    const { xml, etag } = await getFormXmlWithEtag(baseUrl, formId);
    const updated = setCurrentLcidFormLabel(xml, attributeLogicalName, newText, labelId);
    await patchFormXmlStrict(baseUrl, formId, updated, etag ?? undefined);
  } finally {
    try { await setUserUiLanguage(baseUrl, userId, original.uilanguageid); } catch {}
  }
}

/* ───────────── SOAP helpers for UpdateAttribute (entity) ───────────── */

function soapUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '') + '/XRMServices/2011/Organization.svc/web';
}
function escXml(s: string): string {
  return String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
async function soapExecute(baseUrl: string, envelope: string): Promise<Document> {
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

/** Resolve MetadataId + concrete SOAP type name (e.g., StringAttributeMetadata) */
async function getAttributeSoapBasics(
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

/** Merge edited labels with current + ensure non-empty base LCID; also derive baseLabel */
function buildMergedLabels(
  edited: { languageCode: number; label: string }[],
  current: Record<number, string>,
  baseLcid: number,
  attributeLogicalName: string
): { list: { LanguageCode: number; Label: string }[]; baseLabel: string } {
  const keys = new Set<number>([...Object.keys(current).map(Number), ...edited.map((e) => e.languageCode)]);
  const list = Array.from(keys).map((k) => ({
    LanguageCode: k,
    Label: (edited.find((e) => e.languageCode === k)?.label ?? current[k] ?? ''),
  }));
  let baseLabel = list.find((x) => x.LanguageCode === baseLcid)?.Label ?? '';
  if (!baseLabel || !baseLabel.trim()) {
    const any = list.map((x) => x.Label).find((v) => v && v.trim());
    baseLabel = (any || attributeLogicalName.replace(/_/g, ' ')).trim();
    const i = list.findIndex((x) => x.LanguageCode === baseLcid);
    if (i >= 0) list[i].Label = baseLabel;
    else list.push({ LanguageCode: baseLcid, Label: baseLabel });
  }
  return { list, baseLabel };
}

/** SOAP envelope: UpdateAttribute with MetadataId + concrete type + UserLocalizedLabel (base LCID) */
function buildUpdateAttributeEnvelopeWithId(
  entityLogicalName: string,
  attributeMetadataId: string,
  soapTypeName: string,
  localized: { LanguageCode: number; Label: string }[],
  baseLcid: number,
  _baseLabel: string,
  attributeLogicalName?: string
): string {
  const ordered = (localized ?? [])
    .slice()
    .sort((a, b) => (a.LanguageCode === baseLcid ? -1 : b.LanguageCode === baseLcid ? 1 : 0))
    .map((l) => ({ Label: String(l.Label ?? ''), LanguageCode: Number(l.LanguageCode) }));

  const locXml = ordered
    .map(
      (l) => `
        <a:LocalizedLabel>
          <a:Label>${escXml(l.Label)}</a:Label>
          <a:LanguageCode>${l.LanguageCode}</a:LanguageCode>
        </a:LocalizedLabel>`
    )
    .join('');

  const logicalNameXml = attributeLogicalName
    ? `\n              <c:LogicalName>${escXml(attributeLogicalName)}</c:LogicalName>`
    : '';

  return `
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <Execute xmlns="http://schemas.microsoft.com/xrm/2011/Contracts/Services">
      <request i:type="a:UpdateAttributeRequest"
               xmlns:a="http://schemas.microsoft.com/xrm/2011/Contracts"
               xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <a:Parameters xmlns:b="http://schemas.datacontract.org/2004/07/System.Collections.Generic">

          <a:KeyValuePairOfstringanyType>
            <b:key>Attribute</b:key>
            <b:value i:type="c:${soapTypeName}" xmlns:c="http://schemas.microsoft.com/xrm/2011/Metadata">
              <c:MetadataId>${escXml(attributeMetadataId)}</c:MetadataId>${logicalNameXml}

              <c:DisplayName>
                <a:LocalizedLabels>${locXml}
                </a:LocalizedLabels>
                <a:UserLocalizedLabel i:nil="true" />
              </c:DisplayName>

              <c:Description>
                <a:LocalizedLabels>${locXml}
                </a:LocalizedLabels>
                <a:UserLocalizedLabel i:nil="true" />
              </c:Description>

            </b:value>
          </a:KeyValuePairOfstringanyType>

          <a:KeyValuePairOfstringanyType>
            <b:key>EntityName</b:key>
            <b:value i:type="d:string" xmlns:d="http://www.w3.org/2001/XMLSchema">${escXml(entityLogicalName)}</b:value>
          </a:KeyValuePairOfstringanyType>

          <a:KeyValuePairOfstringanyType>
            <b:key>MergeLabels</b:key>
            <b:value i:type="d:boolean" xmlns:d="http://www.w3.org/2001/XMLSchema">true</b:value>
          </a:KeyValuePairOfstringanyType>

        </a:Parameters>
        <a:RequestId i:nil="true" />
        <a:RequestName>UpdateAttribute</a:RequestName>
      </request>
    </Execute>
  </s:Body>
</s:Envelope>`.trim();
}

/** Public: same signature you call from UI */
async function updateAttributeLabelsViaSoap(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  labels: { LanguageCode: number; Label: string }[]
): Promise<void> {
  const edited = labels.map((l) => ({ languageCode: Number(l.LanguageCode), label: String(l.Label ?? '') }));

  const [current, baseLcid] = await Promise.all([
    getCurrentDisplayNameLabels(baseUrl, entityLogicalName, attributeLogicalName),
    getOrgBaseLanguageCode(baseUrl),
  ]);
  const { list: mergedLocalized, baseLabel } = buildMergedLabels(edited, current, baseLcid, attributeLogicalName);

  const { metadataId, soapTypeName } = await getAttributeSoapBasics(baseUrl, entityLogicalName, attributeLogicalName);

  const env = buildUpdateAttributeEnvelopeWithId(
    entityLogicalName,
    metadataId,
    soapTypeName,
    mergedLocalized,
    baseLcid,
    baseLabel
  );
  await soapExecute(baseUrl, env);
}

/* ───────────── Styles ───────────── */

const page: React.CSSProperties = {
  font: '14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
  color: '#111',
  margin: 24,
};
const h1: React.CSSProperties = { fontSize: 18, margin: 0 };
const h2: React.CSSProperties = { fontSize: 16, margin: '16px 0 8px' };
const tbl: React.CSSProperties = { borderCollapse: 'collapse', width: '100%' };
const th: React.CSSProperties = { background: '#f6f8fa', textAlign: 'left', border: '1px solid #ddd', padding: '6px 8px' };
const td: React.CSSProperties = { border: '1px solid #eee', padding: '6px 8px' };
const inp: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d0d7de',
  borderRadius: 8,
  font: 'inherit',
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f6feb',
  background: '#1f6feb',
  color: '#fff',
  cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d0d7de',
  background: '#fff',
  cursor: 'pointer',
};
const infoBox: React.CSSProperties = {
  background: '#f1f8ff',
  border: '1px solid #c8e1ff',
  padding: '6px 8px',
  borderRadius: 8,
  marginBottom: 10,
};
const errorBox: React.CSSProperties = {
  background: '#fff5f5',
  border: '1px solid #ffcccc',
  padding: '6px 8px',
  borderRadius: 8,
  marginBottom: 10,
};

createRoot(document.getElementById('root')!).render(<App />);
