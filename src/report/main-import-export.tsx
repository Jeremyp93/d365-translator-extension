import JSZip from 'jszip';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

/* ───────────── Types & Query Params ───────────── */

interface Label { languageCode: number; label: string }
type Editable = Record<number, string>;

// Query params
const qs = new URLSearchParams(location.search);
const clientUrl = (qs.get('clientUrl') || '').replace(/\/+$/, '');
const entity = qs.get('entity') || '';
const attribute = qs.get('attribute') || '';
const formId = (qs.get('formId') || '').replace(/[{}]/g, ''); // systemformid (optional)

// For picking a single row in Display Strings
const labelId = (qs.get('labelId') || '').trim();
const displayKey = (qs.get('displayKey') || '').trim();

/* ───────────── React App ───────────── */

function App(): JSX.Element {
  // ENTITY DisplayName editor state (existing)
  const [entityLabels, setEntityLabels] = useState<Label[] | null>(null);
  const [langs, setLangs] = useState<number[] | null>(null);
  const [values, setValues] = useState<Editable>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const langList = useMemo(() => (langs ?? []).slice().sort((a, b) => a - b), [langs]);

  // FORM UI translation editor state (SpreadsheetML)
  const [formLcids, setFormLcids] = useState<number[]>([]);
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [formHeaders, setFormHeaders] = useState<string[]>([]);
  const [formRowPrefix, setFormRowPrefix] = useState<string[]>([]); // non-LCID cells
  const [formLoaded, setFormLoaded] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [translationXml, setTranslationXml] = useState<string>('');
  const [originalZipBlob, setOriginalZipBlob] = useState<Blob>(new Blob());

  const onChange = (lcid: number, v: string) => setValues((p) => ({ ...p, [lcid]: v }));
  const onFormChange = (lcid: number, v: string) => setFormValues((p) => ({ ...p, [lcid]: v }));

  /* ───────── Load entity DisplayName labels (existing) ───────── */
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

  /* ───────────── FORM UI: Create temp solution → export → parse ───────────── */

  const onLoadFormUi = async () => {
    let tempUnique = '';
    try {
      setError(null);
      setInfo('Preparing temp solution…');

      // 1) Create temp solution
      tempUnique = await createTempSolution(clientUrl);
      
      // 2) Add entity + (optional) system form
      setInfo('Adding components to temp solution…');
      const entMeta = await fetchJson(
        `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entity)}')?$select=MetadataId`
      );
      await addSolutionComponent(clientUrl, tempUnique, COMPONENT.Entity, entMeta?.MetadataId);
      if (formId) {
        await addSolutionComponent(clientUrl, tempUnique, COMPONENT.SystemForm, formId);
      }

      // 3) Export translations
      setInfo('Exporting translations…');
      const zipBlob = await exportSolutionTranslations(clientUrl, tempUnique);
      setOriginalZipBlob(zipBlob);

      // 4) Read SpreadsheetML
      setInfo('Reading ZIP…');
      const xmlText = await readCrmTranslationsXmlFromZip(zipBlob);
      setTranslationXml(xmlText);

      // 5) Parse + find our row
      setInfo('Parsing SpreadsheetML…');
      const parsed = parseDisplayStringsSheet(xmlText);
      const hit = findDisplayStringsRow(parsed, {
        labelId: labelId || undefined,
      });

      if (!hit) {
        setFormLoaded(false);
        setInfo('No matching row found in Display Strings. Check labelId/displayKey.');
        return;
      }

      setFormHeaders(parsed.headers);
      setFormRowPrefix(hit.prefixCells);
      setFormLcids(hit.lcids);

      const vals: Record<number, string> = {};
      hit.lcids.forEach((lcid, i) => (vals[lcid] = hit.lcidValues[i] ?? ''));
      setFormValues(vals);

      setFormLoaded(true);
      setInfo('Form UI labels loaded from export.');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setFormLoaded(false);
    } finally {
      // 6) Cleanup temp solution
      try {
        if (tempUnique) await deleteSolutionByUniqueName(clientUrl, tempUnique);
      } catch {
        /* swallow cleanup errors */
      }
    }
  };

  /* ───────────── FORM UI Save: recreate temp → build XML → import → delete ───────────── */

  const onSaveFormUi = async () => {
    let tempUnique = '';
    try {
      if (!formLoaded) throw new Error('Nothing to save. Load a row first.');

      setFormSaving(true);
      setError(null);
      setInfo('Preparing temp solution for import…');

      // 1) Create temp solution
      tempUnique = await createTempSolution(clientUrl);

      // 2) Add components (same as on load)
      setInfo('Adding components to temp solution…');
      const entMeta = await fetchJson(
        `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entity)}')?$select=MetadataId`
      );
      await addSolutionComponent(clientUrl, tempUnique, COMPONENT.Entity, entMeta?.MetadataId);
      if (formId) {
        await addSolutionComponent(clientUrl, tempUnique, COMPONENT.SystemForm, formId);
      }

      // 3) Build minimal SpreadsheetML with current edits
      setInfo('Building translation workbook…');
      const parsed = parseDisplayStringsSheet(translationXml);
      const dataRow = buildLocalizedLabelsRow({
        entityName: entity,            // you already have this from query string
        labelId,         // or whatever key you use in the sheet
        headerLcids: parsed.headerLcids,
        formValues,
      });
      const updatedXml = updateCrmTranslationsXml(translationXml, {
        headers: parsed.headers,
        dataRow,
        newSolutionName: tempUnique,
      });

      // 2) Repack the original zip with the updated CrmTranslations.xml
      const updatedZip = await buildUpdatedZipFromOriginal(originalZipBlob, updatedXml);


      // const xmlOut = buildMinimalDisplayStringsWorkbook({
      //   headers: formHeaders,
      //   prefixCells: formRowPrefix,
      //   lcids: formLcids,
      //   valuesByLcid: formValues,
      //   info: {
      //     solutionName: tempUnique,
      //     baseLanguageId: 1033,
      //     baseLanguageName: 'English (United States)'
      //   }
      // });

      // // 4) Zip -> base64
      // setInfo('Zipping…');
      // const zipBase64 = await buildTranslationZip(xmlOut);
      // //const zipBase64 = await makeCrmTranslationsZipBase64(xmlOut);

      // 5) Import
      setInfo('Importing translations…');
      await importSolutionTranslations(clientUrl, updatedZip);

      setInfo('Imported successfully. If changes do not appear, refresh the app.');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      // 6) Cleanup
      try {
        if (tempUnique) await deleteSolutionByUniqueName(clientUrl, tempUnique);
      } catch {
        /* swallow cleanup errors */
      }
      setFormSaving(false);
    }
  };

  /* ───────────── UI ───────────── */

  return (
    <div style={page}>
      <h1 style={h1}>Translations editor</h1>
      <div style={{ margin: '8px 0 4px' }}>
        Entity: <code>{entity}</code> • Attribute: <code>{attribute}</code> • Form: <code>{formId || '(none)'}</code>
      </div>
      <div style={{ color: '#6a737d', marginBottom: 8, fontSize: 12 }}>
        langs: {langs?.length ?? 0} • labels: {entityLabels?.length ?? 0}
      </div>

      {error && <div style={errorBox}>Error: {error}</div>}
      {info && !error && <div style={infoBox}>{info}</div>}

      {/* Existing ENTITY DisplayName editor */}
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
      </section>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={async () => {
            try {
              setSaving(true);
              setError(null);
              setInfo('Saving…');
              const labels = langList.map((lcid) => ({ LanguageCode: lcid, Label: values[lcid] ?? '' }));
              await updateAttributeLabelsViaSoap(clientUrl, entity, attribute, labels);
              setInfo('Publishing…');
              await publishEntityViaWebApi(clientUrl, entity);
              setInfo('Saved & published successfully. If you still see old text, hard refresh the app (Ctrl/Cmd+Shift+R).');
            } catch (e: any) {
              setError(e?.message ?? String(e));
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving || !langs}
          style={btnPrimary}
        >
          {saving ? 'Saving…' : 'Save & Publish'}
        </button>
        <button
          onClick={async () => {
            try {
              const labels = await verifyAttributeLabels(clientUrl, entity, attribute);
              // eslint-disable-next-line no-console
              console.log('[verify] DisplayName.LocalizedLabels:', labels);
              alert('Check console for DisplayName labels (verify).');
            } catch (e: any) {
              setError(e?.message ?? String(e));
            }
          }}
          style={btnGhost}
        >
          Verify
        </button>
      </div>

      {/* NEW: Form UI section */}
      <section style={{ marginTop: 24 }}>
        <h2 style={h2}>Form UI label (Display Strings via Export/Import)</h2>
        <div style={{ color: '#6a737d', marginBottom: 6, fontSize: 12 }}>
          formId: <code>{formId || '(none)'}</code> • labelId: <code>{labelId || '(missing)'}</code> • displayKey: <code>{displayKey || '(missing)'}</code>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={onLoadFormUi} style={btnGhost}>Load from Export</button>
          <button onClick={onSaveFormUi} disabled={!formLoaded || formSaving} style={btnPrimary}>
            {formSaving ? 'Importing…' : 'Save via ImportTranslation'}
          </button>
        </div>

        {formLoaded ? (
          <table style={tbl}>
            <thead>
              <tr>
                <th style={th}>LCID</th>
                <th style={th}>Label</th>
              </tr>
            </thead>
            <tbody>
              {formLcids.map((lcid) => (
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
          <div style={{ color: '#6a737d' }}>No form row loaded yet.</div>
        )}
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
    try { return v.get(); } catch {}
  }
  if (typeof v === 'object') return Object.values(v);
  return [];
}

async function getAttributeLabelTranslations(
  baseUrl: string, entityLogicalName: string, attributeLogicalName: string
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
    lcid: l.LanguageCode, label: l.Label,
  }));
  return labels;
}

async function getCurrentDisplayNameLabels(
  baseUrl: string, entityLogicalName: string, attributeLogicalName: string
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

async function getOrgBaseLanguageCode(baseUrl: string): Promise<number> {
  const base = baseUrl.replace(/\/+$/, '');
  try {
    const j = await fetchJson(`${base}/api/data/v9.2/organizations?$select=languagecode&$top=1`);
    const row = j?.value?.[0];
    const n = Number(row?.languagecode);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {}
  try {
    const langs = await getProvisionedLanguages(base);
    if (Array.isArray(langs) && langs.length) {
      if (langs.includes(1033)) return 1033;
      return langs[0];
    }
  } catch {}
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

/* ───────────── SOAP for entity attribute DisplayName (kept) ───────────── */

function soapUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '') + '/XRMServices/2011/Organization.svc/web';
}
function escXml(s: string): string {
  return String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
async function soapExecute(baseUrl: string, envelope: string): Promise<Document> {
  const r = await fetch(soapUrl(baseUrl), {
    method: 'POST', credentials: 'include',
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

async function getAttributeSoapBasics(
  baseUrl: string, entityLogicalName: string, attributeLogicalName: string
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

function buildMergedLabels(
  edited: { languageCode: number; label: string }[], current: Record<number, string>, baseLcid: number, attributeLogicalName: string
): { list: { LanguageCode: number; Label: string }[]; baseLabel: string } {
  const keys = new Set<number>([...Object.keys(current).map(Number), ...edited.map((e) => e.languageCode)]);
  const list = Array.from(keys).map((k) => ({
    LanguageCode: k, Label: (edited.find((e) => e.languageCode === k)?.label ?? current[k] ?? ''),
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

function buildUpdateAttributeEnvelopeWithId(
  entityLogicalName: string, attributeMetadataId: string, soapTypeName: string,
  localized: { LanguageCode: number; Label: string }[], baseLcid: number, _baseLabel: string, attributeLogicalName?: string
): string {
  const ordered = (localized ?? [])
    .slice()
    .sort((a, b) => (a.LanguageCode === baseLcid ? -1 : b.LanguageCode === baseLcid ? 1 : 0))
    .map((l) => ({ Label: String(l.Label ?? ''), LanguageCode: Number(l.LanguageCode) }));

  const locXml = ordered.map((l) => `
        <a:LocalizedLabel>
          <a:Label>${escXml(l.Label)}</a:Label>
          <a:LanguageCode>${l.LanguageCode}</a:LanguageCode>
        </a:LocalizedLabel>`).join('');

  const logicalNameXml = attributeLogicalName ? `\n              <c:LogicalName>${escXml(attributeLogicalName)}</c:LogicalName>` : '';

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

async function updateAttributeLabelsViaSoap(
  baseUrl: string, entityLogicalName: string, attributeLogicalName: string,
  labels: { LanguageCode: number; Label: string }[]
): Promise<void> {
  const edited = labels.map((l) => ({ languageCode: Number(l.LanguageCode), label: String(l.Label ?? '') }));
  const [current, baseLcid] = await Promise.all([
    getCurrentDisplayNameLabels(baseUrl, entityLogicalName, attributeLogicalName),
    getOrgBaseLanguageCode(baseUrl),
  ]);
  const { list: mergedLocalized, baseLabel } = buildMergedLabels(edited, current, baseLcid, attributeLogicalName);
  const { metadataId, soapTypeName } = await getAttributeSoapBasics(baseUrl, entityLogicalName, attributeLogicalName);
  const env = buildUpdateAttributeEnvelopeWithId(entityLogicalName, metadataId, soapTypeName, mergedLocalized, baseLcid, baseLabel);
  await soapExecute(baseUrl, env);
}

/* ───────────── Export / Import Translation + SpreadsheetML helpers ───────────── */

// Robust base64 → Uint8Array
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  // normalize URL-safe base64 just in case
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);

  const binary = atob(b64);
  const len = binary.length;
  const buf = new ArrayBuffer(len);
  const view = new Uint8Array(buf);
  for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

// ExportTranslation → returns the ZIP as Blob
async function exportSolutionTranslations(baseUrl: string, solutionUniqueName: string): Promise<Blob> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/data/v9.2/solutions/Microsoft.Dynamics.CRM.ExportTranslation()`;

  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    // IMPORTANT: don't include OData-Version headers for a file stream
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ SolutionName: solutionUniqueName })
  });
  if (!r.ok) throw new Error(`ExportTranslation failed: ${await r.text().catch(() => '')}`);

  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
  const j = await r.json();
  const b64: string = (j as any)?.ExportTranslationFile ?? (j as any)?.ExportTranslationFile_Body ?? '';
  if (!b64) throw new Error('ExportTranslation returned no file content.');
  return new Blob([base64ToArrayBuffer(b64)], { type: 'application/zip' });
}
return new Blob([await r.arrayBuffer()], { type: 'application/zip' });
}

// Read CrmTranslations.xml from the ZIP
async function readCrmTranslationsXmlFromZip(zipBlob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(zipBlob);
  const file = zip.file('CrmTranslations.xml') || zip.filter((p: string) => p.toLowerCase().endsWith('crmtranslations.xml'))[0];
  if (!file) throw new Error('CrmTranslations.xml not found in ZIP.');
  return await file.async('text');
}

/** Parse SpreadsheetML "Display Strings" sheet */
function parseDisplayStringsSheet(xmlText: string): {
  headers: string[];
  rows: string[][];
  headerLcids: number[];
  lcidsStartIndex: number;
} {
  // Parse the Excel 2003 XML (SpreadsheetML)
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  const NS_SS = 'urn:schemas-microsoft-com:office:spreadsheet';

  // Find the "Localized Labels" worksheet (case-insensitive + tolerant of prefixes)
  const worksheets = getEls(xml, 'Worksheet', NS_SS);
  const locSheet = worksheets.find((ws) => {
    const n1 = ws.getAttributeNS?.(NS_SS, 'Name');
    const n2 = ws.getAttribute('ss:Name');
    const n3 = ws.getAttribute('Name');
    const name = String(n1 || n2 || n3 || '').trim().toLowerCase();
    return name === 'localized labels';
  });
  if (!locSheet) throw new Error('Worksheet "Localized Labels" not found');

  const table = getEls(locSheet, 'Table', NS_SS)[0];
  if (!table) throw new Error('"Localized Labels" table not found');

  const rowEls = getEls(table, 'Row', NS_SS);
  if (!rowEls.length) throw new Error('"Localized Labels" contains no rows');

  // Header row (with ss:Index handling)
  const headerValues = getRowValues(rowEls[0], NS_SS);
  const headers = headerValues.map((v) => v.trim());

  // LCIDs begin at the first numeric column header (1033, 1036, ...)
  let lcidsStartIndex = headers.findIndex((h) => Number.isFinite(Number(h)));
  if (lcidsStartIndex < 0) lcidsStartIndex = headers.length;
  const headerLcids: number[] = headers
    .slice(lcidsStartIndex)
    .map((h) => Number(h))
    .filter((n) => Number.isFinite(n));

  // Data rows
  const rows: string[][] = [];
  for (let r = 1; r < rowEls.length; r++) {
    rows.push(getRowValues(rowEls[r], NS_SS).map((v) => v.trim()));
  }

  return { headers, rows, headerLcids, lcidsStartIndex };

  function getEls(root: Element | Document, tag: string, ns: string): Element[] {
    const a = Array.from((root as any).getElementsByTagNameNS?.(ns, tag) || []);
    if (a.length) return a as Element[];
    return Array.from((root as any).getElementsByTagName(tag) || []) as Element[];
  }

  // Reads a Row → array of cell texts, honoring ss:Index gaps
  function getRowValues(rowEl: Element, ns: string): string[] {
    const cellsNS = Array.from(rowEl.getElementsByTagNameNS(ns, 'Cell'));
    const cellsFallback = Array.from(rowEl.getElementsByTagName('Cell'));
    const cells = (cellsNS.length ? cellsNS : cellsFallback) as Element[];

    const out: string[] = [];
    let expectedCol = 1; // SpreadsheetML columns are 1-based

    for (const cell of cells) {
      // ss:Index may skip columns
      const idxAttrNS = cell.getAttributeNS?.(ns, 'Index');
      const idxAttr = idxAttrNS ?? cell.getAttribute('ss:Index') ?? cell.getAttribute('Index');
      const idx = Number(idxAttr);

      if (Number.isFinite(idx) && idx >= 1) {
        while (expectedCol < idx) {
          out.push(''); // fill gaps with empty strings
          expectedCol++;
        }
      }

      // Cell text (handle namespaced and non-namespaced <Data>)
      const dataEl =
        (cell.getElementsByTagNameNS(ns, 'Data')[0] as Element) ||
        (cell.getElementsByTagName('Data')[0] as Element);
      const text = (dataEl?.textContent ?? '').trim();
      out.push(text);
      expectedCol++;
    }
    return out;
  }
}

/** Find the row by Label Id (preferred) or (entity + displayKey) */
function findDisplayStringsRow(
  parsed: { headers: string[]; rows: string[][]; headerLcids: number[]; lcidsStartIndex: number },
  key: { labelId?: string; }
): { prefixCells: string[]; lcids: number[]; lcidValues: string[] } | null {
  const { headers, rows, headerLcids, lcidsStartIndex } = parsed;
  const labelIdIdx = headers.findIndex((h) => h.toLowerCase() === 'object id' || h.toLowerCase() === 'objectid');

  let row: string[] | undefined;
  if (key.labelId && labelIdIdx >= 0) {
    row = rows.find((r) => (r[labelIdIdx] || '').toLowerCase() === key.labelId!.toLowerCase());
  }
  if (!row) return null;

  const prefixCells = row.slice(0, lcidsStartIndex);
  const lcidValues = row.slice(lcidsStartIndex, lcidsStartIndex + headerLcids.length);
  return { prefixCells, lcids: headerLcids, lcidValues };
}

/** Build the single Localized Labels row from formValues (LCID→value). */
function buildLocalizedLabelsRow(args: {
  entityName: string;               // e.g. the entity logical name
  labelId: string;               // e.g. the attribute logical name or your chosen key
  headerLcids: number[];            // LCIDs from the parsed sheet (in the exact order they appear)
  formValues: Record<number, string>;
}): (string | number)[] {
  const { entityName, labelId, headerLcids, formValues } = args;
  const lcidCells = headerLcids.map((lcid) => formValues[lcid] ?? '');
  // Matches headers like: ["Entity name","Display String Key", ...LCIDs...]
  return [entityName, labelId, "DisplayName", ...lcidCells];
}

/** If you also have lcidsStartIndex & headers (for validation / future-proofing). */
function buildRowFromParsed(
  entityName: string,
  displayKey: string,
  formValues: Record<number, string>,
  parsed: { headers: string[]; headerLcids: number[]; lcidsStartIndex: number }
): (string | number)[] {
  // Always produce: [prefix columns..., per-LCID columns in the same header order]
  const prefix = [entityName, displayKey]; // we only need two prefix cells per your sheet spec
  const lcidCells = parsed.headerLcids.map((lcid) => formValues[lcid] ?? '');
  return [...prefix, ...lcidCells];
}

/** Update only:
 *  - Worksheet "Localized Labels": keep the header row, replace all data with one row
 *  - Worksheet "Information": set "Solution Name:" second cell to newSolutionName
 * Returns the updated CrmTranslations.xml as string.
 */
function updateCrmTranslationsXml(
  xmlText: string,
  opts: {
    // the header row to keep in "Localized Labels" (must match what the sheet has)
    headers: string[];
    // one data row to write under the headers in "Localized Labels"
    dataRow: (string | number)[];
    // new temp solution name for Information sheet
    newSolutionName: string;
  }
): string {
  const NS_SS = 'urn:schemas-microsoft-com:office:spreadsheet';
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');

  // ---- helpers
  const q = {
    getEls(root: Element | Document, tag: string, ns = NS_SS): Element[] {
      const a = Array.from((root as any).getElementsByTagNameNS?.(ns, tag) || []);
      return a.length ? (a as Element[]) : (Array.from((root as any).getElementsByTagName(tag)) as Element[]);
    },
    getAttr(el: Element, name: string): string | null {
      // Try ss:Name, Name, or unprefixed
      return (
        el.getAttributeNS(NS_SS, name) ||
        el.getAttribute(`ss:${name}`) ||
        el.getAttribute(name)
      );
    },
    cellText(cellEl: Element): string {
      const data =
        (cellEl.getElementsByTagNameNS(NS_SS, 'Data')[0] as Element) ||
        (cellEl.getElementsByTagName('Data')[0] as Element);
      return (data?.textContent ?? '').trim();
    },
    // create <Row><Cell><Data ss:Type="String">...</Data></Cell>...</Row>
    mkRow(cells: (string | number)[]): Element {
      const row = doc.createElementNS(NS_SS, 'Row');
      for (const v of cells) {
        const cell = doc.createElementNS(NS_SS, 'Cell');
        const data = doc.createElementNS(NS_SS, 'Data');
        // NOTE: SpreadsheetML wants ss:Type
        data.setAttributeNS(NS_SS, 'ss:Type', 'String');
        data.textContent = String(v ?? '');
        cell.appendChild(data);
        row.appendChild(cell);
      }
      return row;
    },
    findWorksheetByName(name: string): Element | null {
      const all = q.getEls(doc, 'Worksheet');
      for (const ws of all) {
        const nm = q.getAttr(ws, 'Name');
        if (nm === name) return ws;
      }
      return null;
    },
  };

  // ---- 1) Localized Labels: keep headers, replace data with single row
  const wsLL = q.findWorksheetByName('Localized Labels');
  if (!wsLL) throw new Error('Worksheet "Localized Labels" not found in CrmTranslations.xml');

  const tableLL = q.getEls(wsLL, 'Table')[0];
  if (!tableLL) throw new Error('"Localized Labels" sheet has no Table');

  const rowElsLL = Array.from(tableLL.childNodes).filter((n) => n.nodeType === 1 && (n as Element).localName === 'Row') as Element[];
  if (rowElsLL.length === 0) {
    // If the sheet is empty, create the header row + one data row
    tableLL.appendChild(q.mkRow(opts.headers));
    tableLL.appendChild(q.mkRow(opts.dataRow));
  } else {
    // Ensure first row matches header count (won’t fail if extra/less cells; we just keep it)
    const headerRow = rowElsLL[0];

    // Remove all rows after the header
    for (let i = rowElsLL.length - 1; i >= 1; i--) {
      tableLL.removeChild(rowElsLL[i]);
    }

    // Append one new data row
    tableLL.appendChild(q.mkRow(opts.dataRow));
  }

  // ---- 2) Information: set "Solution Name:" second cell to opts.newSolutionName
  const wsInfo = q.findWorksheetByName('Information');
  if (!wsInfo) throw new Error('Worksheet "Information" not found in CrmTranslations.xml');

  const tableInfo = q.getEls(wsInfo, 'Table')[0];
  if (!tableInfo) throw new Error('"Information" sheet has no Table');

  const infoRows = Array.from(tableInfo.childNodes).filter((n) => n.nodeType === 1 && (n as Element).localName === 'Row') as Element[];

  // Find the row whose first cell == "Solution Name:"
  for (const row of infoRows) {
    const cells = q.getEls(row, 'Cell');
    if (cells.length < 2) continue;
    const firstText = q.cellText(cells[0]);
    if (firstText === 'Solution Name:') {
      // overwrite the second cell
      let data = cells[1].getElementsByTagNameNS(NS_SS, 'Data')[0] as Element;
      if (!data) {
        data = doc.createElementNS(NS_SS, 'Data');
        data.setAttributeNS(NS_SS, 'ss:Type', 'String');
        cells[1].appendChild(data);
      }
      data.textContent = opts.newSolutionName;
      break;
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

/** Overwrite CrmTranslations.xml inside the existing zip (preserves other entries like [Content_Types].xml). */
async function buildUpdatedZipFromOriginal(originalZipBlob: Blob, newCrmTranslationsXml: string): Promise<string> {
  const zip = await JSZip.loadAsync(originalZipBlob);
  zip.file('CrmTranslations.xml', newCrmTranslationsXml);
  // Keep same structure, just regenerate
  return await zip.generateAsync({ type: 'base64' });
}

/** Build a tiny SpreadsheetML with the same header + a single data row */
function buildMinimalDisplayStringsWorkbook(args: {
  headers: string[];              // e.g. ["Entity name","Display String Key","1033","1036","1043"]
  prefixCells: string[];          // e.g. [entityLogicalName, displayStringKey]
  lcids: number[];                // e.g. [1033,1036,1043] (order should match headers after the 2 prefix cols)
  valuesByLcid: Record<number, string>; // e.g. {1033:"Name",1036:"Nom",1043:"Naam"}
  info?: {
    organizationId?: string;
    exportedOn?: string;          // preformatted (e.g. "11/14/25 9:05 AM")
    baseLanguageName?: string;    // e.g. "English (United States)"
    baseLanguageId?: number;      // e.g. 1033
    solutionName?: string;        // e.g. "xlat_tmp_1763110625833"
  };
}): string {
  const { headers, prefixCells, lcids, valuesByLcid, info } = args;

  // Build the “Localized Labels” data row (prefix + per-lcid values)
  const lcidCells = lcids.map((lcid) => valuesByLcid[lcid] ?? '');
  const localizedLabelsRow = [...prefixCells, ...lcidCells];

  const esc = (s: string) =>
    (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));

  const mkRow = (cells: (string | number)[]) =>
    `<Row>` +
    cells
      .map((v) => `<Cell><Data ss:Type="String">${esc(String(v))}</Data></Cell>`)
      .join('') +
    `</Row>`;

  // --- Sheet: Information (two columns: label/value) ---
  const infoRows: (string | number)[][] = [
    ['Organization ID:', info?.organizationId ?? ''],
    ['Exported on:', info?.exportedOn ?? ''],
    ['Base language name:', info?.baseLanguageName ?? ''],
    ['Base language ID:', info?.baseLanguageId ?? ''],
    ['Solution Name:', info?.solutionName ?? ''],
  ];

  const informationSheet =
    `<Worksheet ss:Name="Information">` +
    `<Table>` +
    infoRows.map((r) => mkRow(r)).join('') +
    `</Table>` +
    `</Worksheet>`;

  // --- Sheet: Display Strings (headers only, no data rows) ---
  const displayStringsSheet =
    `<Worksheet ss:Name="Display Strings">` +
    `<Table>` +
    `<Row><Cell><Data ss:Type="String">EntityName</Data></Cell>` +
    `<Cell><Data ss:Type="String">Display String Key</Data></Cell>` +
    `<Cell><Data ss:Type="String">EntityName</Data></Cell>` +
    lcids.map((lcid) =>
      `<Cell><Data ss:Type="String">${esc(String(lcid))}</Data></Cell>`
    ).join('') +
    `</Row>` +
    `</Table>` +
    `</Worksheet>`;

  // --- Sheet: Localized Labels (headers + one data row) ---
  const localizedLabelsSheet =
    `<Worksheet ss:Name="Localized Labels">` +
    `<Table>` +
    mkRow(headers) +                 // header row (same headers as Display Strings)
    mkRow(localizedLabelsRow) +      // single data row
    `</Table>` +
    `</Worksheet>`;

  // Final workbook
  const xml =
    `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"></DocumentProperties><ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel"><ActiveSheet>0</ActiveSheet><ProtectStructure>False</ProtectStructure><ProtectWindows>False</ProtectWindows></ExcelWorkbook><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom" /><Borders /><Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" /><Interior /><NumberFormat /><Protection /></Style><Style ss:ID="s21"><Alignment ss:Horizontal="Left" ss:Vertical="Bottom" /><Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" ss:Bold="1" /><Interior ss:Color="#CCCCFF" ss:Pattern="Solid" /><Protection /></Style><Style ss:ID="s22"><Alignment ss:Horizontal="Left" ss:Vertical="Bottom" /><Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" /><Interior ss:Color="#CCCCFF" ss:Pattern="Solid" /></Style><Style ss:ID="s23"><Alignment ss:Horizontal="Left" ss:Vertical="Bottom" /><Interior ss:Color="#CCCCFF" ss:Pattern="Solid" /><NumberFormat ss:Format="[$-409]m/d/yy\ h:mm\ AM/PM;@" /></Style><Style ss:ID="s24"><Alignment ss:Vertical="Bottom" /><Borders /><Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" /><Interior /><NumberFormat /><Protection ss:Protected="0" /></Style></Styles>` +
    informationSheet +
    displayStringsSheet +
    localizedLabelsSheet +
    `</Workbook>`;

  return xml;
}

async function buildTranslationZip(crmTranslationsXml: string): Promise<string> {
  const zip = new JSZip();
  // IMPORTANT: file names EXACT, and at root
  zip.file('CrmTranslations.xml', crmTranslationsXml);
  zip.file('[Content_Types].xml', buildContentTypesXml());

  // Generate a Blob; keep default UTF-8 for strings; Dataverse is fine with this
  return await zip.generateAsync({ type: 'base64' });
}


function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

// ImportTranslation (base64 ZIP)
async function importSolutionTranslations(baseUrl: string, zipBase64: string): Promise<void> {
  const url = `${baseUrl}/api/data/v9.2/ImportTranslation`;
  await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ TranslationFile: zipBase64, ImportJobId: uuidv4() }),
  });
}

/** Minimal [Content_Types].xml that Dataverse accepts */
function buildContentTypesXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/octet-stream" /></Types>`;
}

/* ───────────── Temp Solution lifecycle ───────────── */
const COMPONENT = { Entity: 1, Attribute: 2, SystemForm: 60 } as const;
// Create temp solution with default publisher
async function getAnyPublisherId(baseUrl: string): Promise<string> {
  const j = await fetchJson(`${baseUrl}/api/data/v9.2/publishers?$select=publisherid&$top=1`);
  const id = j?.value?.[0]?.publisherid;
  if (!id) throw new Error('Could not resolve a Publisher for temp solution.');
  return id;
}
async function createTempSolution(baseUrl: string): Promise<string> {
  const uniqueName = `xlat_tmp_${Date.now()}`;
  const probe = await fetchJson(
    `${baseUrl}/api/data/v9.2/solutions?$select=solutionid,uniquename&$filter=uniquename eq '${encodeURIComponent(uniqueName)}'`
  );
  if (probe?.value?.length) return uniqueName;
  const publisherId = await getAnyPublisherId(baseUrl);
  const r = await fetch(`${baseUrl}/api/data/v9.2/solutions`, {
    method: 'POST', credentials: 'include',
    headers: { Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      friendlyname: `Translations ${new Date().toISOString()}`, uniquename: uniqueName, version: '1.0.0.0', ismanaged: false,
      [`publisherid@odata.bind`]: `/publishers(${publisherId})`,
    }),
  });
  if (!r.ok) throw new Error(`Create solution failed: ${await r.text().catch(() => '')}`);
  return uniqueName;
}

// Delete solution by unique name
async function deleteSolutionByUniqueName(baseUrl: string, uniqueName: string): Promise<void> {
  const j = await fetchJson(`${baseUrl}/api/data/v9.2/solutions?$select=solutionid&$filter=uniquename eq '${encodeURIComponent(uniqueName).replace(/'/g, "''")}'`);
  const id = j?.value?.[0]?.solutionid;
  if (!id) return;
  const r = await fetch(`${baseUrl}/api/data/v9.2/solutions(${id})`, {
    method: 'DELETE', credentials: 'include',
    headers: { Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' },
  });
  if (!r.ok) throw new Error(`Delete solution failed: ${await r.text().catch(() => '')}`);
}

async function addSolutionComponent(
  baseUrl: string, solutionUniqueName: string, componentType: number, objectId: string, addRequiredComponents = false
): Promise<void> {
  const body = {
    SolutionUniqueName: solutionUniqueName,
    ComponentType: componentType,
    ComponentId: objectId.replace(/[{}]/g, ''),
    AddRequiredComponents: addRequiredComponents,
    DoNotIncludeSubcomponents: true,
  };
  const r = await fetch(`${baseUrl}/api/data/v9.2/AddSolutionComponent`, {
    method: 'POST', credentials: 'include',
    headers: { Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`AddSolutionComponent failed: ${await r.text().catch(() => '')}`);
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
