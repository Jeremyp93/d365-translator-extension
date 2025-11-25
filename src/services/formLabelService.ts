import {
  whoAmI,
  getUserSettingsRow,
  setUserUiLanguage,
  getFormXml,
  getFormXmlWithEtag,
  patchFormXmlStrict,
  waitForLanguageToApply,
} from './d365Api';

export interface FormLabelByLcid {
  lcid: number;
  label: string;
}

/* ──────────────────────────────────────────────
   XML helpers (pure)
   ────────────────────────────────────────────── */

/** Find all <cell> nodes that host a control for the given attribute logical name */
function findCellsForAttribute(doc: Document, attributeLogicalName: string): Element[] {
  const cells: Element[] = [];
  const cellEls = Array.from(doc.getElementsByTagName('cell'));
  for (const cell of cellEls) {
    const controls = Array.from(cell.getElementsByTagName('control'));
    const hasMatch = controls.some((c) =>
      (c.getAttribute('datafieldname') || '').toLowerCase() === attributeLogicalName.toLowerCase()
    );
    if (hasMatch) cells.push(cell);
  }
  return cells;
}

/** Read the (current LCID) label text for a specific cell labelId */
function readCurrentLcidFormLabel(formxml: string, attributeLogicalName: string, labelId: string): string {
  const wanted = (labelId || '').replace(/[{}]/g, '').toLowerCase();
  if (!wanted) return '';

  const doc = new DOMParser().parseFromString(formxml, 'text/xml');
  const cells = findCellsForAttribute(doc, attributeLogicalName);

  for (const cell of cells) {
    const cellId = (cell.getAttribute('id') || '').replace(/[{}]/g, '').toLowerCase();
    if (cellId !== wanted) continue;

    const labelsNode = cell.getElementsByTagName('labels')[0];
    if (!labelsNode) continue;

    const labelEls = labelsNode.getElementsByTagName('label');
    if (labelEls.length) {
      // formxml for a specific LCID typically has only one <label> in <labels>
      return labelEls[0].getAttribute('description') || '';
    }
  }
  return '';
}

/** Set the (current LCID) label text for a specific cell labelId, returns updated XML */
function setCurrentLcidFormLabel(
  formxml: string,
  attributeLogicalName: string,
  labelId: string,
  newText: string
): string {
  const wanted = (labelId || '').replace(/[{}]/g, '').toLowerCase();
  if (!wanted) return formxml;

  const doc = new DOMParser().parseFromString(formxml, 'text/xml');
  const cells = findCellsForAttribute(doc, attributeLogicalName);

  for (const cell of cells) {
    const cellId = (cell.getAttribute('id') || '').replace(/[{}]/g, '').toLowerCase();
    if (cellId !== wanted) continue;

    let labels = cell.getElementsByTagName('labels')[0];
    if (!labels) {
      labels = doc.createElement('labels');
      // keep close to top of <cell> for parity with platform
      cell.insertBefore(labels, cell.firstChild);
    }
    // Per-LCID formxml usually only holds one <label>; keep that convention.
    let label = labels.getElementsByTagName('label')[0];
    if (!label) {
      label = doc.createElement('label');
      labels.appendChild(label);
    }
    // We don't force languagecode here; platform rewrites it for the current LCID.
    label.setAttribute('description', newText ?? '');
  }

  return new XMLSerializer().serializeToString(doc);
}

/* ──────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────── */

/**
 * Read a field’s label for ALL requested LCIDs by temporarily switching the current user’s UI language.
 * Uses formxml snapshot for the active LCID and extracts the target cell’s <labels>/<label>.
 */
export async function readFormFieldLabelsAllLcids(
  baseUrl: string,
  formId: string,                 // systemform.formid (guid without braces)
  attributeLogicalName: string,
  labelId: string,                // <cell id="..."> that hosts the control
  lcids: number[]
): Promise<FormLabelByLcid[]> {
  if (!lcids?.length) return [];
  const userId = await whoAmI(baseUrl);
  const us = await getUserSettingsRow(baseUrl, userId);
  const original = { uilanguageid: us.uilanguageid, helplanguageid: us.helplanguageid, localeid: us.localeid };

  const out: FormLabelByLcid[] = [];
  try {
    for (const lcid of lcids) {
      await setUserUiLanguage(baseUrl, userId, lcid);
      await waitForLanguageToApply(baseUrl, formId);
      const xml = await getFormXml(baseUrl, formId);
      const text = readCurrentLcidFormLabel(xml, attributeLogicalName, labelId);
      out.push({ lcid, label: text });
    }
  } finally {
    try {
      await setUserUiLanguage(baseUrl, userId, original.uilanguageid);
    } catch {
      /* noop */
    }
  }
  return out;
}

/**
 * Save labels for a set of LCIDs by switching the current user’s UI language per LCID,
 * updating the label text in formxml, and PATCHing systemform back with If-Match ETag.
 * Only LCIDs included in valuesByLcid are modified.
 */
export async function saveFormFieldLabelsAllLcids(
  baseUrl: string,
  formId: string,
  attributeLogicalName: string,
  labelId: string,
  valuesByLcid: Record<number, string>
): Promise<void> {
  const userId = await whoAmI(baseUrl);
  const us = await getUserSettingsRow(baseUrl, userId);
  const original = { uilanguageid: us.uilanguageid };

  const lcids = Object.keys(valuesByLcid).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);

  try {
    for (const lcid of lcids) {
      await setUserUiLanguage(baseUrl, userId, lcid);
      await waitForLanguageToApply(baseUrl, formId);

      const { xml, etag } = await getFormXmlWithEtag(baseUrl, formId);
      const updatedXml = setCurrentLcidFormLabel(xml, attributeLogicalName, labelId, valuesByLcid[lcid] ?? '');
      await patchFormXmlStrict(baseUrl, formId, updatedXml, etag ?? undefined);
    }
  } finally {
    try {
      await setUserUiLanguage(baseUrl, userId, original.uilanguageid);
    } catch {
      /* noop */
    }
  }
}
