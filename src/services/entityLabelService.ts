import {
  fetchJson,
  toArray,
  getOrgBaseLanguageCode,
  getAttributeSoapBasics,
  soapExecute,
  escXml,
} from './d365Api';

export interface Label {
  languageCode: number;
  label: string;
}

/* ────────────────────────────────────────────────────────────────────────────
   Reads
   ──────────────────────────────────────────────────────────────────────────── */

/** Web API: returns DisplayName.LocalizedLabels for an attribute as {languageCode, label}[] */
export async function getAttributeLabelTranslations(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<Label[]> {
  const url =
    `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=DisplayName`;
  const j = await fetchJson(url);
  const arr = toArray(j?.DisplayName?.LocalizedLabels);
  return arr.map((l: any) => ({
    languageCode: Number(l.LanguageCode),
    label: String(l.Label ?? ''),
  }));
}

/** Convenience: current DisplayName labels as Record<lcid, text> */
export async function getCurrentDisplayNameLabelsMap(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<Record<number, string>> {
  const labels = await getAttributeLabelTranslations(baseUrl, entityLogicalName, attributeLogicalName);
  const map: Record<number, string> = {};
  for (const l of labels) {
    if (Number.isFinite(l.languageCode)) map[l.languageCode] = l.label ?? '';
  }
  return map;
}

/** For debug/verify (raw projection helpful in UIs/console) */
export async function verifyAttributeLabels(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<Array<{ lcid: number; label: string }>> {
  const list = await getAttributeLabelTranslations(baseUrl, entityLogicalName, attributeLogicalName);
  return list.map(x => ({ lcid: x.languageCode, label: x.label }));
}

/* ────────────────────────────────────────────────────────────────────────────
   Write (SOAP UpdateAttribute)
   ──────────────────────────────────────────────────────────────────────────── */

/** Merge edited labels with current + ensure non-empty base LCID; also derive baseLabel */
function buildMergedLabels(
  edited: { languageCode: number; label: string }[],
  current: Record<number, string>,
  baseLcid: number,
  attributeLogicalName: string
): { list: { LanguageCode: number; Label: string }[]; baseLabel: string } {
  const keys = new Set<number>([
    ...Object.keys(current).map(Number),
    ...edited.map((e) => e.languageCode),
  ]);
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

/** SOAP envelope: UpdateAttribute with MetadataId + concrete type + LocalizedLabels */
function buildUpdateAttributeEnvelopeWithId(
  entityLogicalName: string,
  attributeMetadataId: string,
  soapTypeName: string,
  localized: { LanguageCode: number; Label: string }[],
  baseLcid: number
): string {
  // Put base LCID first; keep only minimal fields (Label, LanguageCode)
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
              <c:MetadataId>${escXml(attributeMetadataId)}</c:MetadataId>
              <c:DisplayName>
                <a:LocalizedLabels>${locXml}
                </a:LocalizedLabels>
                <a:UserLocalizedLabel i:nil="true" />
              </c:DisplayName>
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

/**
 * Update entity attribute DisplayName labels with SOAP.
 * - Merges with current labels.
 * - Ensures base org language has a non-empty value.
 */
export async function updateAttributeLabelsViaSoap(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  labels: { LanguageCode: number; Label: string }[]
): Promise<void> {
  // Normalize incoming list
  const edited = labels.map((l) => ({
    languageCode: Number(l.LanguageCode),
    label: String(l.Label ?? ''),
  }));

  // Merge with current + enforce base-language non-empty
  const [currentMap, baseLcid] = await Promise.all([
    getCurrentDisplayNameLabelsMap(baseUrl, entityLogicalName, attributeLogicalName),
    getOrgBaseLanguageCode(baseUrl),
  ]);
  const { list: mergedLocalized } = buildMergedLabels(
    edited,
    currentMap,
    baseLcid,
    attributeLogicalName
  );

  // Resolve MetadataId + concrete type
  const { metadataId, soapTypeName } = await getAttributeSoapBasics(
    baseUrl,
    entityLogicalName,
    attributeLogicalName
  );

  // Execute SOAP UpdateAttribute
  const env = buildUpdateAttributeEnvelopeWithId(
    entityLogicalName,
    metadataId,
    soapTypeName,
    mergedLocalized,
    baseLcid
  );
  await soapExecute(baseUrl, env);
}

/* ────────────────────────────────────────────────────────────────────────────
   Small convenience used by pages
   ──────────────────────────────────────────────────────────────────────────── */

export async function saveEntityDisplayNameLabels(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  valuesByLcid: Record<number, string>
): Promise<void> {
  const labels = Object.keys(valuesByLcid)
    .map(Number)
    .sort((a, b) => a - b)
    .map((lcid) => ({ LanguageCode: lcid, Label: valuesByLcid[lcid] ?? '' }));

  await updateAttributeLabelsViaSoap(baseUrl, entityLogicalName, attributeLogicalName, labels);
}