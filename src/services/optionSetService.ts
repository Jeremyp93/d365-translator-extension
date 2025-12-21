import {
  fetchJson,
  toArray,
  getOrgBaseLanguageCode,
  publishEntityViaWebApi,
} from './d365Api';
import type { OptionSetMetadata, OptionValue, OptionSetType, GlobalOptionSetSummary, Label } from '../types';
import { mergeOptionSetLabels } from '../utils/labelMerger';
import { buildBatchRequest, executeBatchRequest, BatchOperation } from '../utils/batchBuilder';

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
  attributeLogicalName: string,
  apiVersion: string = 'v9.2'
): Promise<string> {
  const url =
    `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
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
  attributeLogicalName: string,
  apiVersion: string = 'v9.2'
): Promise<OptionSetMetadata> {
  // First, check the attribute type to determine which property to expand
  const typeUrl =
    `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=AttributeType`;
  
  const typeCheck = await fetchJson(typeUrl);
  const attrType = String(typeCheck?.AttributeType ?? '');
  
  // For Boolean (Two Options), we need a different approach
  if (attrType === 'Boolean') {
    const boolUrl =
      `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
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
      metadataId: '',
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
      `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
      `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata` +
      `?$select=AttributeType&$expand=OptionSet($select=IsGlobal,Name,DisplayName,Options),GlobalOptionSet($select=Name,DisplayName,Options)`;
  } else if (attrType === 'State') {
    url =
      `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
      `/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')/Microsoft.Dynamics.CRM.StateAttributeMetadata` +
      `?$select=AttributeType&$expand=OptionSet($select=Options)`;
  } else if (attrType === 'Status') {
    url =
      `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
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
    metadataId: '',
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
  baseUrl: string,
  apiVersion: string = 'v9.2'
): Promise<GlobalOptionSetSummary[]> {
  const url =
    `${baseUrl}/api/data/${apiVersion}/GlobalOptionSetDefinitions` +
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
  optionSetName: string,
  apiVersion: string = 'v9.2'
): Promise<OptionSetMetadata> {
  const url =
    `${baseUrl}/api/data/${apiVersion}/GlobalOptionSetDefinitions(Name='${encodeURIComponent(
      optionSetName
    )}')/Microsoft.Dynamics.CRM.OptionSetMetadata` +
    `?$select=MetadataId,Name,DisplayName,IsGlobal,Options`;

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
    metadataId: String(j?.MetadataId ?? ''),
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
  return mergeOptionSetLabels(editedOptions, currentOptions, baseLcid);
}

export async function updateLocalOptionSetLabels(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  editedOptions: Array<{ value: number; labels: Label[] }>,
  apiVersion: string = 'v9.2'
): Promise<void> {
  // 1. Get current metadata and base language
  const [currentMetadata, baseLcid] = await Promise.all([
    getOptionSetMetadata(baseUrl, entityLogicalName, attributeLogicalName, apiVersion),
    getOrgBaseLanguageCode(baseUrl, apiVersion),
  ]);

  // 2. Merge edited labels with current labels
  const mergedOptions = mergeOptionLabels(editedOptions, currentMetadata.options, baseLcid);

  if (!mergedOptions.length) {
    return;
  }

  // 3. Build batch operations
  const operations: BatchOperation[] = mergedOptions
    .filter(opt => toArray(opt.labels).length > 0)
    .map(opt => ({
      method: 'POST' as const,
      url: `/api/data/${apiVersion}/UpdateOptionValue`,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
      body: {
        EntityLogicalName: entityLogicalName,
        AttributeLogicalName: attributeLogicalName,
        Value: opt.value,
        Label: {
          LocalizedLabels: toArray(opt.labels).map(l => ({
            Label: l.Label,
            LanguageCode: l.LanguageCode,
          })),
        },
        MergeLabels: true,
      },
    }));

  if (operations.length === 0) {
    return;
  }

  // 4. Execute batch request
  const batchRequest = buildBatchRequest({ baseUrl, apiVersion, operations });
  const result = await executeBatchRequest(batchRequest);

  if (!result.success) {
    throw new Error(
      `Batch UpdateOptionValue (local) failed${
        result.innerErrorStatus ? ` (inner status ${result.innerErrorStatus})` : ''
      }: ${result.responseText}`
    );
  }

  // 5. Publish entity changes (still needed for local option sets)
  await publishEntityViaWebApi(baseUrl, entityLogicalName);
}

export async function updateGlobalOptionSetLabels(
  baseUrl: string,
  optionSetName: string,
  editedOptions: Array<{ value: number; labels: Label[] }>,
  apiVersion: string = 'v9.2'
): Promise<void> {
  // 1. Get current metadata and base language
  const [currentMetadata, baseLcid] = await Promise.all([
    getGlobalOptionSet(baseUrl, optionSetName, apiVersion),
    getOrgBaseLanguageCode(baseUrl, apiVersion),
  ]);

  // 2. Merge edited labels with current labels
  const mergedOptions = mergeOptionLabels(editedOptions, currentMetadata.options, baseLcid);

  if (!mergedOptions.length) {
    return;
  }

  // 3. Build batch operations (only difference is the body structure)
  const operations: BatchOperation[] = mergedOptions
    .filter(opt => toArray(opt.labels).length > 0)
    .map(opt => ({
      method: 'POST' as const,
      url: `/api/data/${apiVersion}/UpdateOptionValue`,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
      body: {
        OptionSetName: optionSetName, // ← Only difference from local option sets
        Value: opt.value,
        Label: {
          LocalizedLabels: toArray(opt.labels).map(l => ({
            Label: l.Label,
            LanguageCode: l.LanguageCode,
          })),
        },
        MergeLabels: true,
      },
    }));

  if (operations.length === 0) {
    return;
  }

  // 4. Execute batch request
  const batchRequest = buildBatchRequest({ baseUrl, apiVersion, operations });
  const result = await executeBatchRequest(batchRequest);

  if (!result.success) {
    throw new Error(
      `Batch UpdateOptionValue (global) failed${
        result.innerErrorStatus ? ` (inner status ${result.innerErrorStatus})` : ''
      }: ${result.responseText}`
    );
  }
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
