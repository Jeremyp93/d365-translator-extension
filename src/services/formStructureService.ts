import type { FormStructure, FormTab, FormColumn, FormSection, FormControl, FormHeaderFooter, Label } from '../types';
import {
  getFormXml,
  getFormXmlWithEtag,
  patchFormXmlStrict,
  waitForLanguageToApply,
  sleep,
} from './d365Api';
import { getProvisionedLanguagesCached } from './languageService';
import { isEditableControlType } from '../utils/controlClassIds';
import { forEachLanguage } from '../utils/languageSwitcher';

/**
 * Retrieve formXml for all provisioned languages and merge labels
 * Similar to readFormFieldLabelsAllLcids but for the entire form structure
 */
export async function getFormXmlAllLanguages(
  baseUrl: string,
  formId: string
): Promise<FormStructure> {
  const lcids = await getProvisionedLanguagesCached(baseUrl);
  if (!lcids?.length) {
    // Fallback to single language if no provisioned languages found
    const xml = await getFormXml(baseUrl, formId);
    return parseFormXml(xml);
  }

  // Always include base English (1033) to capture the form's base language labels
  // Many forms have 1033 as the base language even if it's not provisioned
  const allLcidsToRetrieve = Array.from(new Set([1033, ...lcids]));
  const rawXmlByLcid: Record<number, string> = {};

  const structuresByLcid = await forEachLanguage(baseUrl, allLcidsToRetrieve, async (lcid) => {
    await sleep(300); // optional small delay
    const xml = await getFormXml(baseUrl, formId);
    rawXmlByLcid[lcid] = xml; // Store raw XML for this language
    // Pass the current LCID so parseFormXml knows what language context the descriptions are in
    const structure = parseFormXml(xml, lcid);
    return { lcid, structure };
  });

  // Merge all labels from different language versions
  return mergeFormStructures(structuresByLcid, rawXmlByLcid);
}

/**
 * Merge form structures from different language versions into one with all labels
 */
function mergeFormStructures(
  structuresByLcid: Array<{ lcid: number; structure: FormStructure }>,
  rawXmlByLcid: Record<number, string>
): FormStructure {
  if (structuresByLcid.length === 0) {
    return { tabs: [], rawXml: '', rawXmlByLcid };
  }

  // Use first structure as base
  const base = structuresByLcid[0].structure;
  const merged: FormStructure = {
    header: base.header ? { controls: base.header.controls.map(ctrl => ({ ...ctrl, labels: [] })) } : undefined,
    tabs: base.tabs.map((tab) => ({
      ...tab,
      labels: [],
      columns: tab.columns.map((col) => ({
        ...col,
        sections: col.sections.map((section) => ({
          ...section,
          labels: [],
          controls: section.controls.map((control) => ({
            ...control,
            labels: [],
          })),
        })),
      })),
    })),
    footer: base.footer ? { controls: base.footer.controls.map(ctrl => ({ ...ctrl, labels: [] })) } : undefined,
    rawXml: base.rawXml,
    rawXmlByLcid,
  };

  // Merge labels from all language versions
  for (const { lcid, structure } of structuresByLcid) {
    // Merge header labels
    if (structure.header && merged.header) {
      structure.header.controls.forEach((control, ctrlIdx) => {
        if (merged.header!.controls[ctrlIdx]) {
          control.labels.forEach((label) => {
            const exists = merged.header!.controls[ctrlIdx].labels.some(
              (existing) => existing.languageCode === label.languageCode && existing.label === label.label
            );
            if (!exists) {
              merged.header!.controls[ctrlIdx].labels.push(label);
            }
          });
        }
      });
    }

    // Merge tab labels
    structure.tabs.forEach((tab, tabIdx) => {
      if (merged.tabs[tabIdx]) {
        // Add tab labels (keep original languageCode from XML, deduplicate)
        tab.labels.forEach((label) => {
          const exists = merged.tabs[tabIdx].labels.some(
            (existing) => existing.languageCode === label.languageCode && existing.label === label.label
          );
          if (!exists) {
            merged.tabs[tabIdx].labels.push(label);
          }
        });

        tab.columns.forEach((col, colIdx) => {
          if (merged.tabs[tabIdx].columns[colIdx]) {
            col.sections.forEach((section, secIdx) => {
              if (merged.tabs[tabIdx].columns[colIdx].sections[secIdx]) {
                // Add section labels (keep original languageCode from XML, deduplicate)
                section.labels.forEach((label) => {
                  const exists = merged.tabs[tabIdx].columns[colIdx].sections[secIdx].labels.some(
                    (existing) => existing.languageCode === label.languageCode && existing.label === label.label
                  );
                  if (!exists) {
                    merged.tabs[tabIdx].columns[colIdx].sections[secIdx].labels.push(label);
                  }
                });

                section.controls.forEach((control, ctrlIdx) => {
                  if (merged.tabs[tabIdx].columns[colIdx].sections[secIdx].controls[ctrlIdx]) {
                    // Add control labels (keep original languageCode from XML, deduplicate)
                    control.labels.forEach((label) => {
                      const exists = merged.tabs[tabIdx].columns[colIdx].sections[secIdx].controls[
                        ctrlIdx
                      ].labels.some(
                        (existing) => existing.languageCode === label.languageCode && existing.label === label.label
                      );
                      if (!exists) {
                        merged.tabs[tabIdx].columns[colIdx].sections[secIdx].controls[ctrlIdx].labels.push(label);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    // Merge footer labels
    if (structure.footer && merged.footer) {
      structure.footer.controls.forEach((control, ctrlIdx) => {
        if (merged.footer!.controls[ctrlIdx]) {
          control.labels.forEach((label) => {
            const exists = merged.footer!.controls[ctrlIdx].labels.some(
              (existing) => existing.languageCode === label.languageCode && existing.label === label.label
            );
            if (!exists) {
              merged.footer!.controls[ctrlIdx].labels.push(label);
            }
          });
        }
      });
    }
  }

  return merged;
}

/**
 * Parse header or footer section
 * @param containerEl - The header or footer XML element
 * @param currentLcid - The LCID context for labels
 * @returns FormHeaderFooter with controls
 */
function parseHeaderFooter(containerEl: Element | null, currentLcid?: number): FormHeaderFooter | undefined {
  if (!containerEl) return undefined;

  const controls: FormControl[] = [];
  const rowElements = Array.from(containerEl.getElementsByTagName('row'));

  for (const rowEl of rowElements) {
    const cellElements = Array.from(rowEl.getElementsByTagName('cell'));
    for (const cellEl of cellElements) {
      const controlElements = Array.from(cellEl.getElementsByTagName('control'));
      for (const ctrlEl of controlElements) {
        const cellLabels = parseLabels(cellEl, currentLcid);

        const control: FormControl = {
          id: ctrlEl.getAttribute('id') || cellEl.getAttribute('id') || `control-${controls.length}`,
          cellId: cellEl.getAttribute('id') || undefined,
          name: ctrlEl.getAttribute('name') || undefined,
          classId: ctrlEl.getAttribute('classid') || undefined,
          datafieldname: ctrlEl.getAttribute('datafieldname') || undefined,
          disabled: parseBool(ctrlEl.getAttribute('disabled')),
          visible: parseBool(ctrlEl.getAttribute('visible')),
          labels: cellLabels,
        };
        controls.push(control);
      }
    }
  }

  return controls.length > 0 ? { controls } : undefined;
}

/**
 * Parse formxml into a hierarchical structure for display
 * @param formxml - The raw XML string from systemforms.formxml
 * @param currentLcid - The LCID context the XML was retrieved in (used to override languagecode attribute)
 * @returns Parsed form structure with tabs, sections, controls
 */
export function parseFormXml(formxml: string, currentLcid?: number): FormStructure {
  const doc = new DOMParser().parseFromString(formxml, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + parseError.textContent);
  }

  // Parse header
  const headerEl = doc.querySelector('form > header');
  const header = parseHeaderFooter(headerEl, currentLcid);

  // Parse tabs
  const tabs: FormTab[] = [];
  const tabElements = Array.from(doc.getElementsByTagName('tab'));

  for (const tabEl of tabElements) {
    const tab: FormTab = {
      id: tabEl.getAttribute('id') || tabEl.getAttribute('name') || `tab-${tabs.length}`,
      name: tabEl.getAttribute('name') || undefined,
      visible: parseBool(tabEl.getAttribute('visible')),
      showlabel: parseBool(tabEl.getAttribute('showlabel')),
      labels: parseLabels(tabEl, currentLcid),
      columns: [],
    };

    // Parse columns
    const columnElements = Array.from(tabEl.getElementsByTagName('column'));
    for (const colEl of columnElements) {
      const column: FormColumn = {
        width: colEl.getAttribute('width') || '100%',
        sections: [],
      };

      // Parse sections
      const sectionElements = Array.from(colEl.getElementsByTagName('section'));
      for (const secEl of sectionElements) {
        const section: FormSection = {
          id: secEl.getAttribute('id') || secEl.getAttribute('name') || `section-${column.sections.length}`,
          name: secEl.getAttribute('name') || undefined,
          visible: parseBool(secEl.getAttribute('visible')),
          showlabel: parseBool(secEl.getAttribute('showlabel')),
          labels: parseLabels(secEl, currentLcid),
          controls: [],
        };

        // Parse rows and cells to find controls
        const rowElements = Array.from(secEl.getElementsByTagName('row'));
        for (const rowEl of rowElements) {
          const cellElements = Array.from(rowEl.getElementsByTagName('cell'));
          for (const cellEl of cellElements) {
            const controlElements = Array.from(cellEl.getElementsByTagName('control'));
            for (const ctrlEl of controlElements) {
              // Get cell labels for the control
              const cellLabels = parseLabels(cellEl, currentLcid);

              const control: FormControl = {
                id: ctrlEl.getAttribute('id') || cellEl.getAttribute('id') || `control-${section.controls.length}`,
                cellId: cellEl.getAttribute('id') || undefined, // Store cell ID for labelId
                name: ctrlEl.getAttribute('name') || undefined,
                classId: ctrlEl.getAttribute('classid') || undefined,
                datafieldname: ctrlEl.getAttribute('datafieldname') || undefined,
                disabled: parseBool(ctrlEl.getAttribute('disabled')),
                visible: parseBool(ctrlEl.getAttribute('visible')),
                labels: cellLabels,
              };
              section.controls.push(control);
            }
          }
        }

        column.sections.push(section);
      }

      tab.columns.push(column);
    }

    tabs.push(tab);
  }

  // Parse footer
  const footerEl = doc.querySelector('form > footer');
  const footer = parseHeaderFooter(footerEl, currentLcid);

  return {
    header,
    tabs,
    footer,
    rawXml: formxml,
  };
}

/**
 * Parse label elements from a parent element
 * Only looks for direct child <labels> element to avoid picking up nested navigation items
 * @param element - The XML element to parse labels from
 * @param currentLcid - If provided, overrides the languagecode attribute (since XML languagecode doesn't change when switching languages)
 */
function parseLabels(element: Element, currentLcid?: number): Label[] {
  const labels: Label[] = [];
  
  // Only look for direct child <labels> element
  let labelsNode: Element | null = null;
  for (const child of Array.from(element.children)) {
    if (child.tagName.toLowerCase() === 'labels') {
      labelsNode = child;
      break;
    }
  }
  
  if (!labelsNode) return labels;

  // Only get direct child <label> elements of the <labels> node
  // to avoid picking up labels from nested structures like NavBar items
  const labelElements = Array.from(labelsNode.children).filter(
    (child) => child.tagName.toLowerCase() === 'label'
  );
  
  for (const labelEl of labelElements) {
    const xmlLanguageCode = Number(labelEl.getAttribute('languagecode'));
    const label = labelEl.getAttribute('description') || '';

    if (!Number.isFinite(xmlLanguageCode)) continue;

    // If currentLcid is provided, prioritize matching labels but allow fallback to base language (1033)
    // This handles cases where a translation doesn't exist for the current language
    if (currentLcid !== undefined) {
      // Always include if it matches the current LCID
      if (xmlLanguageCode === currentLcid) {
        labels.push({ languageCode: xmlLanguageCode, label });
      }
      // Also include base language (1033 English) as fallback if no current LCID label exists yet
      else if (xmlLanguageCode === 1033 && !labels.some(l => l.languageCode === currentLcid)) {
        labels.push({ languageCode: currentLcid, label });
      }
      // Skip all other languages
    } else {
      // No currentLcid specified, include all labels
      labels.push({ languageCode: xmlLanguageCode, label });
    }
  }

  return labels;
}

/**
 * Parse boolean attribute values (handles "true", "false", "1", "0", null)
 */
function parseBool(value: string | null): boolean | undefined {
  if (value === null || value === '') return undefined;
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === '1') return true;
  if (lower === 'false' || lower === '0') return false;
  return undefined;
}

/**
 * Get a display label for a specific LCID, falling back to the first available
 */
export function getDisplayLabel(labels: Label[], preferredLcid?: number): string {
  if (labels.length === 0) return '';
  
  if (preferredLcid !== undefined) {
    const match = labels.find(l => l.languageCode === preferredLcid);
    if (match && match.label) return match.label;
  }
  
  // Fallback to first non-empty label
  const firstNonEmpty = labels.find(l => l.label);
  return firstNonEmpty?.label || '';
}

/**
 * Build a breadcrumb path for UI display
 */
export function buildPath(parts: string[]): string {
  return parts.filter(Boolean).join(' > ');
}

/**
 * Update labels in formXml for a specific language code
 * Modifies the XML to reflect changes from FormStructure
 */
function updateLabelsInXml(formxml: string, structure: FormStructure, targetLcid: number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(formxml, 'text/xml');
  const formEl = doc.documentElement;

  // Update header labels
  if (structure.header) {
    const headerEl = formEl.querySelector('header');
    if (headerEl) {
      const rowElements = Array.from(headerEl.getElementsByTagName('row'));
      let controlIdx = 0;
      for (const rowEl of rowElements) {
        const cellElements = Array.from(rowEl.getElementsByTagName('cell'));
        for (const cellEl of cellElements) {
          const controlElements = Array.from(cellEl.getElementsByTagName('control'));
          if (controlElements.length > 0 && controlIdx < structure.header.controls.length) {
            const control = structure.header.controls[controlIdx];
            if (isEditableControlType(control.classId)) {
              updateElementLabels(cellEl, control.labels, targetLcid);
            }
            controlIdx++;
          }
        }
      }
    }
  }

  // Update tab labels
  const tabElements = Array.from(formEl.getElementsByTagName('tab'));
  structure.tabs.forEach((tab, tabIdx) => {
    if (tabIdx >= tabElements.length) return;
    const tabEl = tabElements[tabIdx];
    updateElementLabels(tabEl, tab.labels, targetLcid);

    // Get column elements for this tab
    const columnElements = Array.from(tabEl.getElementsByTagName('column'));

    tab.columns.forEach((col, colIdx) => {
      if (colIdx >= columnElements.length) return;
      const colEl = columnElements[colIdx];

      // Get section elements for this column
      const sectionElements = Array.from(colEl.getElementsByTagName('section'));

      col.sections.forEach((section, secIdx) => {
        if (secIdx >= sectionElements.length) return;
        const secEl = sectionElements[secIdx];
        updateElementLabels(secEl, section.labels, targetLcid);

        // Update control (cell) labels
        const rowElements = Array.from(secEl.getElementsByTagName('row'));
        let controlIdx = 0;
        for (const rowEl of rowElements) {
          const cellElements = Array.from(rowEl.getElementsByTagName('cell'));
          for (const cellEl of cellElements) {
            const controlElements = Array.from(cellEl.getElementsByTagName('control'));
            if (controlElements.length > 0 && controlIdx < section.controls.length) {
              const control = section.controls[controlIdx];
              // Only update labels for editable control types (skip sub-grids, quick views, etc.)
              if (isEditableControlType(control.classId)) {
                updateElementLabels(cellEl, control.labels, targetLcid);
              }
              controlIdx++;
            }
          }
        }
      });
    });
  });

  // Update footer labels
  if (structure.footer) {
    const footerEl = formEl.querySelector('footer');
    if (footerEl) {
      const rowElements = Array.from(footerEl.getElementsByTagName('row'));
      let controlIdx = 0;
      for (const rowEl of rowElements) {
        const cellElements = Array.from(rowEl.getElementsByTagName('cell'));
        for (const cellEl of cellElements) {
          const controlElements = Array.from(cellEl.getElementsByTagName('control'));
          if (controlElements.length > 0 && controlIdx < structure.footer.controls.length) {
            const control = structure.footer.controls[controlIdx];
            if (isEditableControlType(control.classId)) {
              updateElementLabels(cellEl, control.labels, targetLcid);
            }
            controlIdx++;
          }
        }
      }
    }
  }

  const serializer = new XMLSerializer();
  let xmlString = serializer.serializeToString(doc);

  // Add space before self-closing tags to match Dynamics 365 format
  xmlString = xmlString.replace(/([^\/\s])\/>/g, '$1 />');

  return xmlString;
}

/**
 * Update label elements for a specific LCID within an XML element
 * If a label for the target LCID exists in our structure but not in the XML,
 * we'll update the first label element and change its languagecode attribute
 */
function updateElementLabels(element: Element, labels: Label[], targetLcid: number): void {
  // Find the <labels> child element
  let labelsNode: Element | null = null;
  for (const child of Array.from(element.children)) {
    if (child.tagName.toLowerCase() === 'labels') {
      labelsNode = child;
      break;
    }
  }

  if (!labelsNode) return;

  // Find the matching label in our structure
  const matchingLabel = labels.find((l) => l.languageCode === targetLcid);
  if (!matchingLabel) return;

  // Find the label element for the target LCID
  const labelElements = Array.from(labelsNode.children).filter(
    (child) => child.tagName.toLowerCase() === 'label'
  );

  // First, try to find an existing label with the target LCID
  let targetLabelEl = labelElements.find(
    (labelEl) => Number(labelEl.getAttribute('languagecode')) === targetLcid
  );

  if (targetLabelEl) {
    // Update existing label for this LCID
    targetLabelEl.setAttribute('description', matchingLabel.label);
  } else if (labelElements.length > 0) {
    // No label exists for this LCID in the XML, update the first label element
    // This happens when we switch to a language context but the XML still has labels from another language
    const firstLabel = labelElements[0];
    firstLabel.setAttribute('languagecode', targetLcid.toString());
    firstLabel.setAttribute('description', matchingLabel.label);
  }
}

/**
 * Save updated form structure back to Dataverse for all languages
 * Similar to readFormFieldLabelsAllLcids, we must switch language for each update
 */
export async function saveFormStructure(
  baseUrl: string,
  formId: string,
  structure: FormStructure,
  onProgress?: (status: string) => void
): Promise<void> {
  const lcids = await getProvisionedLanguagesCached(baseUrl);
  if (!lcids?.length) {
    throw new Error('No provisioned languages found');
  }

  await forEachLanguage(baseUrl, lcids, async (lcid) => {
    onProgress?.(`Saving language ${lcid}...`);

    // Wait for language to apply
    await waitForLanguageToApply(baseUrl, formId);

    // Get current XML with etag for this language
    const { xml, etag } = await getFormXmlWithEtag(baseUrl, formId);

    // Update labels for this specific LCID
    const updatedXml = updateLabelsInXml(xml, structure, lcid);

    // Patch back to Dataverse
    await patchFormXmlStrict(baseUrl, formId, updatedXml, etag || undefined);
  });
}
