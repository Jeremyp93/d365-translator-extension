import type { AttributeSummary } from './entityMetadataService';

export type EditableFieldKind =
  | 'string'
  | 'memo'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'picklist'
  | 'lookup';

export type FieldKind = EditableFieldKind | 'readonly';

export interface FieldState {
  logicalName: string;
  displayName: string;
  attributeType: string;
  kind: FieldKind;
  originalValue: unknown;
  currentValue: unknown;
  formattedValue?: string;
  isReadOnly: boolean;
  readOnlyReason?: 'type' | 'system' | 'unsupported-type' | 'no-nav-prop';
  /** Only for Lookup. */
  lookupTargetEntity?: string;
  /** Only for Picklist / State / Status. Populated later by picklist metadata loader. */
  options?: Array<{ value: number; label: string }>;
}

const SYSTEM_FIELDS = new Set([
  'createdby', 'createdon', 'createdonbehalfby',
  'modifiedby', 'modifiedon', 'modifiedonbehalfby',
  'versionnumber', 'overriddencreatedon', 'importsequencenumber',
  'timezoneruleversionnumber', 'utcconversiontimezonecode',
  'ownerid', 'owninguser', 'owningteam', 'owningbusinessunit',
]);

const UNSUPPORTED_TYPES = new Set([
  'Virtual', 'File', 'Image', 'PartyList',
  'CalculatedField', 'Rollup', 'ManagedProperty',
  'EntityName', 'Uniqueidentifier',
  // Out of MVP:
  'MultiSelectPicklist', 'Customer', 'Owner',
]);

export function classifyKind(attributeType: string): FieldKind {
  if (UNSUPPORTED_TYPES.has(attributeType)) return 'readonly';
  switch (attributeType) {
    case 'String': return 'string';
    case 'Memo': return 'memo';
    case 'Integer':
    case 'BigInt':
    case 'Decimal':
    case 'Double':
    case 'Money':
      return 'number';
    case 'Boolean': return 'boolean';
    case 'DateTime': return 'datetime';
    case 'Picklist':
    case 'State':
    case 'Status':
      return 'picklist';
    case 'Lookup': return 'lookup';
    default: return 'readonly';
  }
}

export function mergeFieldStates(
  attributes: AttributeSummary[],
  record: Record<string, unknown>,
  opts: { pkLogicalName?: string } = {}
): FieldState[] {
  return attributes.map((attr) => {
    const logical = attr.LogicalName;
    const displayName = attr.DisplayName?.UserLocalizedLabel?.Label || logical;
    const kind = classifyKind(attr.AttributeType);
    const isSystem = SYSTEM_FIELDS.has(logical) || logical === opts.pkLogicalName;

    // Lookups: raw value lives under `_<field>_value`.
    const lookupKey = `_${logical}_value`;
    const isLookup = kind === 'lookup';
    const rawValue = isLookup ? record[lookupKey] : record[logical];
    const formatted =
      (record[`${isLookup ? lookupKey : logical}@OData.Community.Display.V1.FormattedValue`] as string | undefined) ?? undefined;
    const lookupTarget = isLookup
      ? (record[`${lookupKey}@Microsoft.Dynamics.CRM.lookuplogicalname`] as string | undefined)
      : undefined;

    const typeReadOnly = kind === 'readonly';
    const isReadOnly = typeReadOnly || isSystem;
    const readOnlyReason: FieldState['readOnlyReason'] = typeReadOnly
      ? 'unsupported-type'
      : isSystem
      ? 'system'
      : undefined;

    return {
      logicalName: logical,
      displayName,
      attributeType: attr.AttributeType,
      kind,
      originalValue: rawValue ?? null,
      currentValue: rawValue ?? null,
      formattedValue: formatted,
      isReadOnly,
      readOnlyReason,
      lookupTargetEntity: lookupTarget,
    };
  });
}

/** Returns true iff the two values differ by semantics used in PATCH. */
export function isFieldDirty(field: FieldState): boolean {
  const a = field.originalValue;
  const b = field.currentValue;
  if (a === b) return false;
  if (a == null && b == null) return false;
  return true;
}
