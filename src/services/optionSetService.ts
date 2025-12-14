import {
  fetchJson,
  toArray,
  getOrgBaseLanguageCode,
  publishEntityViaWebApi,
} from './d365Api';
import type { OptionSetMetadata, OptionValue, OptionSetType, GlobalOptionSetSummary, Label } from '../types';

/* ────────────────────────────────────────────────────────────────────────────
   Reads - Attribute Type & OptionSet Metadata
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Get attribute type to determine if it's an OptionSet field.
 * Returns AttributeType like "Picklist", "Boolean", "String", etc.
 */
export async function getAttributeType(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<string> {
  const url =
    `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=AttributeType`;
  const j = await fetchJson(url);
  return String(j?.AttributeType ?? '');
}

/**
 * Check if attribute type is an OptionSet type
 */
export function isOptionSetType(attributeType: string): boolean {
  return ['Picklist', 'MultiSelectPicklist', 'Boolean', 'Status', 'State'].includes(attributeType);
}

/**
 * Get OptionSet metadata for a field attribute.
 * Includes whether it's global, option values, etc.
 */
export async function getOptionSetMetadata(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<OptionSetMetadata> {
  // First, check the attribute type to determine which property to expand
  const typeUrl =
    `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=AttributeType`;
  
  const typeCheck = await fetchJson(typeUrl);
  const attrType = String(typeCheck?.AttributeType ?? '');
  
  // For Boolean (Two Options), we need a different approach
  if (attrType === 'Boolean') {
    const boolUrl =
      `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
      `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')/Microsoft.Dynamics.CRM.BooleanAttributeMetadata` +
      `?$select=AttributeType&$expand=OptionSet($select=TrueOption,FalseOption)`;
    
    const j = await fetchJson(boolUrl);
    const optionSet = j?.OptionSet;
    
    if (!optionSet) {
      throw new Error(`No OptionSet found for Boolean attribute ${entityLogicalName}.${attributeLogicalName}`);
    }
    
    // Convert Boolean options to standard format
    const options: OptionValue[] = [];
    
    if (optionSet.TrueOption) {
      options.push({
        value: Number(optionSet.TrueOption.Value ?? 1),
        labels: toArray(optionSet.TrueOption.Label?.LocalizedLabels).map((l: any) => ({
          languageCode: Number(l.LanguageCode),
          label: String(l.Label ?? ''),
        })),
      });
    }
    
    if (optionSet.FalseOption) {
      options.push({
        value: Number(optionSet.FalseOption.Value ?? 0),
        labels: toArray(optionSet.FalseOption.Label?.LocalizedLabels).map((l: any) => ({
          languageCode: Number(l.LanguageCode),
          label: String(l.Label ?? ''),
        })),
      });
    }
    
    return {
      isGlobal: false,
      name: null,
      displayName: 'Two Options',
      optionSetType: 'Boolean',
      options,
    };
  }
  
  // For Picklist, State, Status, MultiSelectPicklist
  let url: string;
  if (attrType === 'Picklist' || attrType === 'MultiSelectPicklist') {
    url =
      `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
      `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata` +
      `?$select=AttributeType&$expand=OptionSet($select=IsGlobal,Name,DisplayName,Options),GlobalOptionSet($select=Name,DisplayName,Options)`;
  } else if (attrType === 'State') {
    url =
      `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
      `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')/Microsoft.Dynamics.CRM.StateAttributeMetadata` +
      `?$select=AttributeType&$expand=OptionSet($select=Options)`;
  } else if (attrType === 'Status') {
    url =
      `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
      `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')/Microsoft.Dynamics.CRM.StatusAttributeMetadata` +
      `?$select=AttributeType&$expand=OptionSet($select=Options)`;
  } else {
    throw new Error(`Attribute type ${attrType} is not an OptionSet type`);
  }
  
  const j = await fetchJson(url);
  const optionSet = j?.OptionSet;
  const globalSet = j?.GlobalOptionSet;
  const target = optionSet || globalSet;
  
  if (!target) {
    throw new Error(`No OptionSet found for ${entityLogicalName}.${attributeLogicalName}`);
  }

  const isGlobal = Boolean(target.IsGlobal);
  const name = isGlobal ? String(target.Name ?? '') : null;
  const displayName = target.DisplayName?.UserLocalizedLabel?.Label ?? name ?? '';
  const attributeType = String(j?.AttributeType ?? '') as OptionSetType;

  const options = toArray(target.Options).map((o: any) => ({
    value: Number(o.Value),
    labels: toArray(o?.Label?.LocalizedLabels).map((l: any) => ({
      languageCode: Number(l.LanguageCode),
      label: String(l.Label ?? ''),
    })),
    description: o.Description
      ? toArray(o.Description.LocalizedLabels).map((l: any) => ({
          languageCode: Number(l.LanguageCode),
          label: String(l.Label ?? ''),
        }))
      : undefined,
    color: o.Color ? String(o.Color) : undefined,
  }));

  return {
    isGlobal,
    name,
    displayName,
    optionSetType: attributeType,
    options,
  };
}

/**
 * Get option values for an attribute (convenience wrapper)
 */
export async function getOptionSetOptions(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<OptionValue[]> {
  const metadata = await getOptionSetMetadata(baseUrl, entityLogicalName, attributeLogicalName);
  return metadata.options;
}

/* ────────────────────────────────────────────────────────────────────────────
   Reads - Global OptionSets
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * List all global OptionSets in the organization
 */
export async function listGlobalOptionSets(
  baseUrl: string
): Promise<GlobalOptionSetSummary[]> {
  const url =
    `${baseUrl}/api/data/v9.2/GlobalOptionSetDefinitions` +
    `?$select=Name,DisplayName,Description,MetadataId,IsGlobal`;

  const j = await fetchJson(url);
  const items = toArray(j?.value);

  return items.map((item: any): GlobalOptionSetSummary => ({
    name: String(item.Name ?? ''),
    displayName: item.DisplayName?.UserLocalizedLabel?.Label ?? item.Name ?? '',
    description: item.Description?.UserLocalizedLabel?.Label,
    metadataId: String(item.MetadataId ?? ''),
  }));
}

/**
 * Get a specific global OptionSet by name with full option details
 */
export async function getGlobalOptionSet(
  baseUrl: string,
  optionSetName: string
): Promise<OptionSetMetadata> {
  const url =
    `${baseUrl}/api/data/v9.2/GlobalOptionSetDefinitions(Name='${encodeURIComponent(
      optionSetName
    )}')/Microsoft.Dynamics.CRM.OptionSetMetadata` +
    `?$select=Name,DisplayName,IsGlobal,Options`;

  const j = await fetchJson(url);

  const options = toArray(j?.Options).map((o: any) => ({
    value: Number(o.Value),
    labels: toArray(o?.Label?.LocalizedLabels).map((l: any) => ({
      languageCode: Number(l.LanguageCode),
      label: String(l.Label ?? ''),
    })),
    description: o.Description
      ? toArray(o.Description.LocalizedLabels).map((l: any) => ({
          languageCode: Number(l.LanguageCode),
          label: String(l.Label ?? ''),
        }))
      : undefined,
    color: o.Color ? String(o.Color) : undefined,
  }));

  return {
    isGlobal: Boolean(j?.IsGlobal ?? true),
    name: optionSetName,
    displayName: j?.DisplayName?.UserLocalizedLabel?.Label ?? optionSetName,
    options,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Writes - Update OptionSet Translations
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Merge edited option labels with current labels
 * editedOptions: array of { value, labels: { languageCode, label }[] }
 * currentOptions: existing option values
 */
function mergeOptionLabels(
  editedOptions: Array<{ value: number; labels: Label[] }>,
  currentOptions: OptionValue[],
  baseLcid: number
): Array<{ value: number; labels: { LanguageCode: number; Label: string }[] }> {
  const result: Array<{ value: number; labels: { LanguageCode: number; Label: string }[] }> = [];

  // For each option value in current or edited
  const allValues = new Set([
    ...currentOptions.map(o => o.value),
    ...editedOptions.map(o => o.value),
  ]);

  for (const value of allValues) {
    const edited = editedOptions.find(o => o.value === value);
    const current = currentOptions.find(o => o.value === value);

    // Collect all language codes
    const allLcids = new Set<number>();
    if (current) current.labels.forEach(l => allLcids.add(l.languageCode));
    if (edited) edited.labels.forEach(l => allLcids.add(l.languageCode));

    const labels: { LanguageCode: number; Label: string }[] = [];

    for (const lcid of allLcids) {
  const editedLabel = edited?.labels.find(l => l.languageCode === lcid);
  const currentLabel = current?.labels.find(l => l.languageCode === lcid);

  const editedText = editedLabel?.label ?? "";
  const currentText = currentLabel?.label ?? "";

  const editedEmpty = editedText.trim() === "";
  const currentEmpty = currentText.trim() === "";

  // 1️⃣ If both previous and actual are empty → skip entirely
  if (editedEmpty && currentEmpty) {
    continue;
  }

  // 2️⃣ If edited is empty but current had value → CLEAR IT
  if (editedEmpty && !currentEmpty) {
    labels.push({
      LanguageCode: lcid,
      Label: ""   // explicitly send empty string
    });
    continue;
  }

  // 3️⃣ Normal case → edited wins
  labels.push({
    LanguageCode: lcid,
    Label: editedText
  });
}

    // Ensure base language has a non-empty value
    const baseLabel = labels.find(l => l.LanguageCode === baseLcid);
    if (!baseLabel || !baseLabel.Label.trim()) {
      const anyLabel = labels.find(l => l.Label && l.Label.trim())?.Label;
      if (anyLabel) {
        const baseIdx = labels.findIndex(l => l.LanguageCode === baseLcid);
        if (baseIdx >= 0) {
          labels[baseIdx].Label = anyLabel;
        } else {
          labels.push({ LanguageCode: baseLcid, Label: anyLabel });
        }
      }
    }

    // Sort: base language first
    labels.sort((a, b) =>
      a.LanguageCode === baseLcid ? -1 : b.LanguageCode === baseLcid ? 1 : 0
    );

    result.push({ value, labels });
  }

  return result;
}


export async function updateLocalOptionSetLabels(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  editedOptions: Array<{ value: number; labels: Label[] }>
): Promise<void> {
  // 1. Get current metadata and base language
  const [currentMetadata, baseLcid] = await Promise.all([
    getOptionSetMetadata(baseUrl, entityLogicalName, attributeLogicalName),
    getOrgBaseLanguageCode(baseUrl),
  ]);

  // 2. Merge edited labels with current labels
  const mergedOptions = mergeOptionLabels(
    editedOptions,
    currentMetadata.options,
    baseLcid
  );

  if (!mergedOptions.length) {
    return;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/api/data/v9.2/UpdateOptionValue`;

  // 3. Call UpdateOptionValue once per option (no batch for now)
  await Promise.all(
    mergedOptions.map(async (opt) => {
      const labelsArray = toArray(opt.labels);

      // If nothing to send for this option, skip
      if (!labelsArray.length) {
        return;
      }

      const body = {
        EntityLogicalName: entityLogicalName,
        AttributeLogicalName: attributeLogicalName,
        Value: opt.value,
        Label: {
          LocalizedLabels: labelsArray.map((l) => ({
            Label: l.Label,          // may be "" if user cleared it
            LanguageCode: l.LanguageCode,
          })),
        },
        // Keep existing labels for languages not included
        MergeLabels: true,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "OData-Version": "4.0",
          "OData-MaxVersion": "4.0",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `UpdateOptionValue (local) failed for ${entityLogicalName}.${attributeLogicalName} / value ${opt.value}: ` +
            `${res.status} ${res.statusText} ${text}`
        );
      }
    })
  );

  // 4. Publish entity changes (still needed for local option sets)
  await publishEntityViaWebApi(baseUrl, entityLogicalName);
}

// export async function updateGlobalOptionSetLabels(
//   baseUrl: string,
//   optionSetName: string,
//   editedOptions: Array<{ value: number; labels: Label[] }>
// ): Promise<void> {
//   // 1. Get current metadata and base language (same as before)
//   const [currentMetadata, baseLcid] = await Promise.all([
//     getGlobalOptionSet(baseUrl, optionSetName),
//     getOrgBaseLanguageCode(baseUrl),
//   ]);

//   // 2. Merge edited labels with current labels (your existing logic)
//   const mergedOptions = mergeOptionLabels(
//     editedOptions,
//     currentMetadata.options,
//     baseLcid
//   );

//   const url = `${baseUrl.replace(/\/+$/, "")}/api/data/v9.2/UpdateOptionValue`;

//   // 3. Call UpdateOptionValue once per option
//   await Promise.all(
//     mergedOptions.map(async (opt) => {
//       const labelsArray = toArray(opt.labels);

//       if (!labelsArray.length) {
//         return;
//       }

//       const body = {
//         OptionSetName: optionSetName,
//         Value: opt.value,
//         Label: {
//           // Label complex type; UserLocalizedLabel is optional, so we can omit it
//           LocalizedLabels: labelsArray.map((l) => ({
//             Label: l.Label,
//             LanguageCode: l.LanguageCode,
//           })),
//         },
//         // Keep labels for languages you don't send here
//         MergeLabels: true,
//       };

//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json; charset=utf-8",
//           "OData-Version": "4.0",
//           "OData-MaxVersion": "4.0",
//           Accept: "application/json",
//         },
//         body: JSON.stringify(body),
//       });

//       if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         throw new Error(
//           `UpdateOptionValue failed for ${optionSetName} / value ${opt.value}: ` +
//             `${res.status} ${res.statusText} ${text}`
//         );
//       }
//     })
//   );

//   // Global option sets are automatically published; nothing else to do
// }
export async function updateGlobalOptionSetLabels(
  baseUrl: string,
  optionSetName: string,
  editedOptions: Array<{ value: number; labels: Label[] }>
): Promise<void> {
  // 1. Get current metadata and base language
  const [currentMetadata, baseLcid] = await Promise.all([
    getGlobalOptionSet(baseUrl, optionSetName),
    getOrgBaseLanguageCode(baseUrl),
  ]);

  // 2. Merge edited labels with current labels (your logic, including clear/empty rules)
  const mergedOptions = mergeOptionLabels(
    editedOptions,
    currentMetadata.options,
    baseLcid
  );

  if (!mergedOptions.length) {
    return;
  }

  const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");
  const batchBoundary = `batch_${crypto.randomUUID()}`;
  const changesetBoundary = `changeset_${crypto.randomUUID()}`;

  const lines: string[] = [];

  // Outer batch header
  lines.push(`--${batchBoundary}`);
  lines.push(`Content-Type: multipart/mixed;boundary=${changesetBoundary}`);
  lines.push("");

let contentId = 1;
let hasAnyOperation = false;

  // 3. One operation per option in a single atomic changeset
  for (const opt of mergedOptions) {
    const labelsArray = toArray(opt.labels);

    // If you truly want to skip options with no labels at all:
    if (!labelsArray.length) {
      continue;
    }

    hasAnyOperation = true;

    const body = {
      OptionSetName: optionSetName,
      Value: opt.value,
      Label: {
        LocalizedLabels: labelsArray.map((l) => ({
          Label: l.Label,          // may be "" if you cleared it
          LanguageCode: l.LanguageCode,
        })),
      },
      MergeLabels: true,
    };

    lines.push(`--${changesetBoundary}`);
    lines.push("Content-Type: application/http");
    lines.push("Content-Transfer-Encoding: binary");
    lines.push(`Content-ID: ${contentId++}`);
    lines.push("");
    lines.push("POST /api/data/v9.2/UpdateOptionValue HTTP/1.1");
    lines.push("Content-Type: application/json; charset=utf-8");
    lines.push("Accept: application/json");
    lines.push("");
    lines.push(JSON.stringify(body));
    lines.push("");
  }

   // If everything ended up being skipped, don't send an empty changeset
  if (!hasAnyOperation) {
    return;
  }

  // Close changeset and batch
  lines.push(`--${changesetBoundary}--`);
  lines.push(`--${batchBoundary}--`);

  const batchBody = lines.join("\r\n");

  const res = await fetch(`${trimmedBaseUrl}/api/data/v9.2/$batch`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/mixed;boundary=${batchBoundary}`,
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      Accept: "application/json",
    },
    body: batchBody,
  });

  const responseText = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(
      `Batch UpdateOptionValue failed (HTTP ${res.status} ${res.statusText}): ${responseText}`
    );
  }

  // Dataverse returns 200/202 even if a sub-request fails,
  // so we inspect the body for 4xx/5xx in the inner responses.
  const innerErrorMatch = /HTTP\/1\.1\s(4\d\d|5\d\d)/.exec(responseText);
  if (innerErrorMatch) {
    throw new Error(
      `Batch UpdateOptionValue failed inside changeset (inner status ${innerErrorMatch[1]}): ${responseText}`
    );
  }

  // If we get here:
  // - all UpdateOptionValue calls in the changeset succeeded
  // - Dataverse has applied them atomically (rollback on any failure)
}

/* ────────────────────────────────────────────────────────────────────────────
   Convenience wrappers for components
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Save option set labels from a simple Record<optionValue, Record<lcid, label>> structure
 */
export async function saveOptionSetLabels(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  valuesByOptionValue: Record<number, Record<number, string>>,
  isGlobal: boolean,
  globalOptionSetName?: string
): Promise<void> {
  const editedOptions = Object.keys(valuesByOptionValue)
    .map(Number)
    .map(optionValue => ({
      value: optionValue,
      labels: Object.keys(valuesByOptionValue[optionValue])
        .map(Number)
        .map(lcid => ({
          languageCode: lcid,
          label: valuesByOptionValue[optionValue][lcid] ?? '',
        })),
    }));

  if (isGlobal && globalOptionSetName) {
    await updateGlobalOptionSetLabels(baseUrl, globalOptionSetName, editedOptions);
  } else {
    await updateLocalOptionSetLabels(baseUrl, entityLogicalName, attributeLogicalName, editedOptions);
  }
}
