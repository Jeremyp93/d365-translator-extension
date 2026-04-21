# Record Editor Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a popup-triggered modal that lets the user view every attribute of the currently-opened D365 record, edit supported types, and PATCH only the changed fields back to D365.

**Architecture:** A new `openRecordEditor` method on the injected page controller (`__d365Ctl`) reads `Xrm.Page` live and injects the existing modal iframe with `mode=record-editor`. Inside the iframe, `ModalApp` branches to a new `RecordEditorModal` that fetches record data + metadata in parallel, renders one editor per attribute type, tracks a per-field diff, and PATCHes only dirty fields with `If-Match` ETag. On success the iframe posts `SAVE_COMPLETE`; `pageController` calls `Xrm.Page.data.refresh(false)` and closes the iframe.

**Tech Stack:** React 18, TypeScript (strict), Vite multi-entry, Fluent UI v9, Chrome MV3, D365 Web API v9.2.

**Important correction vs. design doc:** the popup does **not** use `chrome.tabs.sendMessage` — the existing pattern (`useD365Controller` → `callController(tabId, frameId, method)` → `chrome.scripting.executeScript` invoking `__d365Ctl.<method>()` in MAIN world) is reused. The rest of the design stands.

**Source of truth:** [`docs/plans/2026-04-21-record-editor-modal-design.md`](./2026-04-21-record-editor-modal-design.md).

## Testing note

This repo has no test framework (per `CLAUDE.md`). Each task's verification step is one of:
- `npx tsc --noEmit` — type check
- `npm run lint` — ESLint
- `npm run build` — production build passes
- Concrete manual smoke against a D365 environment with the unpacked `dist/` loaded in Chrome

"Failing test → implementation → passing test" is replaced with "failing compile → implementation → clean compile" where meaningful, and a manual smoke step at each feature-visible checkpoint.

## Task ordering rationale

Data/plumbing layers first (URL builder → services → hook), then presentation (editors → field row → modal), then wiring (ModalApp branch → relay → controller → popup), then the conflict/error UI last so the simplest happy path can be exercised as early as possible.

---

### Task 0: Baseline — confirm clean build on current branch

**Files:** none (read-only verification)

**Step 1:** Run `npx tsc --noEmit` in the repo root.

**Step 2:** Run `npm run lint`.

**Step 3:** Run `npm run build`.

**Expected:** all three pass cleanly. If any fails, stop — something in the working copy was broken before this plan started. Don't proceed until the baseline is green.

---

### Task 1: `buildRecordUrl` in `src/utils/urlBuilders.ts`

Record retrieve + PATCH share the same URL shape `{clientUrl}/api/data/{apiVersion}/{entitySet}({id})`.

**Files:**
- Modify: `src/utils/urlBuilders.ts` (add one export, after `buildUserSettingsUrl` on line ~159)

**Step 1: Add the builder**

```ts
/**
 * Build URL for a specific record (retrieve / patch).
 */
export function buildRecordUrl(
  options: UrlBuilderOptions & {
    entitySetName: string;
    recordId: string;
    select?: string[];
  }
): string {
  const { baseUrl, apiVersion = D365_API_VERSION, entitySetName, recordId, select } = options;
  const api = buildApiUrl(baseUrl, apiVersion);
  const guid = normalizeGuid(recordId);
  let url = `${api}/${entitySetName}(${guid})`;
  if (select?.length) url += `?$select=${select.join(',')}`;
  return url;
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/utils/urlBuilders.ts
git commit -m "feat(urlBuilders): add buildRecordUrl for record retrieve and patch"
```

---

### Task 2: Entity set + navigation property resolver

`entitySetName` is needed for every retrieve/PATCH, and a lookup PATCH also needs the **navigation property name** (e.g., `primarycontactid` logical → `primarycontactid` navProp, but custom lookups often differ). Both come from the same `EntityDefinitions` endpoint, so keep them in one file.

**Files:**
- Create: `src/services/entitySetResolver.ts`

**Step 1: Write the file**

```ts
import { fetchJson } from './d365Api';
import { buildEntityDefinitionUrl, buildApiUrl } from '../utils/urlBuilders';
import { D365_API_VERSION } from '../config/constants';

/** Cache for the lifetime of the caller (passed in). */
export interface ResolverCache {
  entitySet: Map<string, string>;           // logicalName → entitySetName
  navProps: Map<string, NavigationPropertyInfo[]>; // logicalName → many-to-one nav props
}

export interface NavigationPropertyInfo {
  /** Attribute's logical name (e.g., "primarycontactid"). */
  referencingAttribute: string;
  /** Nav property to use in `<navProp>@odata.bind`. */
  referencingEntityNavigationPropertyName: string;
  /** Target entity logical name (e.g., "contact"). */
  referencedEntity: string;
  /** Target entity's entity set name (e.g., "contacts"). */
  referencedEntitySet: string;
}

export function createResolverCache(): ResolverCache {
  return { entitySet: new Map(), navProps: new Map() };
}

export async function resolveEntitySet(
  baseUrl: string,
  entityLogicalName: string,
  cache: ResolverCache,
  apiVersion: string = D365_API_VERSION
): Promise<string> {
  const cached = cache.entitySet.get(entityLogicalName);
  if (cached) return cached;

  const url = buildEntityDefinitionUrl({
    baseUrl,
    apiVersion,
    entityLogicalName,
    select: ['EntitySetName', 'LogicalName'],
  });
  const j = await fetchJson(url) as { EntitySetName?: string };
  const set = j?.EntitySetName;
  if (!set) throw new Error(`EntitySetName missing for ${entityLogicalName}`);
  cache.entitySet.set(entityLogicalName, set);
  return set;
}

/**
 * Resolve many-to-one nav properties for the entity (lookups defined ON this entity).
 * Populates entitySet cache for every target entity encountered, so subsequent
 * PATCHes with lookup @odata.bind can build the target set URL without extra calls.
 */
export async function resolveManyToOneNavProps(
  baseUrl: string,
  entityLogicalName: string,
  cache: ResolverCache,
  apiVersion: string = D365_API_VERSION
): Promise<NavigationPropertyInfo[]> {
  const cached = cache.navProps.get(entityLogicalName);
  if (cached) return cached;

  const api = buildApiUrl(baseUrl, apiVersion);
  const url =
    `${api}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/ManyToOneRelationships?$select=ReferencingAttribute,ReferencingEntityNavigationPropertyName,ReferencedEntity`;
  const j = await fetchJson(url) as { value: Array<{
    ReferencingAttribute: string;
    ReferencingEntityNavigationPropertyName: string;
    ReferencedEntity: string;
  }> };

  // Hydrate target entity sets in parallel (so lookup PATCH has everything ready).
  const targets = Array.from(new Set((j.value || []).map((r) => r.ReferencedEntity)));
  await Promise.all(
    targets.map((t) =>
      resolveEntitySet(baseUrl, t, cache, apiVersion).catch(() => undefined)
    )
  );

  const result: NavigationPropertyInfo[] = (j.value || []).map((r) => ({
    referencingAttribute: r.ReferencingAttribute,
    referencingEntityNavigationPropertyName: r.ReferencingEntityNavigationPropertyName,
    referencedEntity: r.ReferencedEntity,
    referencedEntitySet: cache.entitySet.get(r.ReferencedEntity) || '',
  }));
  cache.navProps.set(entityLogicalName, result);
  return result;
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/services/entitySetResolver.ts
git commit -m "feat(services): add entity set and many-to-one nav prop resolver"
```

---

### Task 3: Record data service (retrieve + patch)

`fetchJson` throws a generic `Error` with `HTTP <status>: <body>` on non-2xx — we need to distinguish 412 from 403/400/404/5xx, and we need to expose `@odata.etag` from the retrieve body.

**Files:**
- Create: `src/services/recordDataService.ts`

**Step 1: Write the file**

```ts
import { buildRecordUrl } from '../utils/urlBuilders';
import { D365_API_VERSION } from '../config/constants';

export interface RetrievedRecord {
  etag: string;
  /**
   * Record body. Keys include raw values, annotated formatted values
   * (`field@OData.Community.Display.V1.FormattedValue`), and
   * lookup target info (`_field_value@Microsoft.Dynamics.CRM.lookuplogicalname`).
   */
  data: Record<string, unknown>;
}

export class RecordApiError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 400)}`);
    this.status = status;
    this.body = body;
  }
}

const ANNOTATIONS = 'OData.Community.Display.V1.FormattedValue,Microsoft.Dynamics.CRM.*';

export async function retrieveRecord(
  baseUrl: string,
  entitySetName: string,
  recordId: string,
  apiVersion: string = D365_API_VERSION
): Promise<RetrievedRecord> {
  const url = buildRecordUrl({ baseUrl, apiVersion, entitySetName, recordId });
  const r = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: `odata.include-annotations="${ANNOTATIONS}"`,
    },
  });
  if (!r.ok) throw new RecordApiError(r.status, await safeText(r));
  const json = await r.json() as Record<string, unknown>;
  const etag = String(json['@odata.etag'] || '');
  return { etag, data: json };
}

export async function patchRecord(
  baseUrl: string,
  entitySetName: string,
  recordId: string,
  body: Record<string, unknown>,
  etag: string,
  apiVersion: string = D365_API_VERSION
): Promise<void> {
  const url = buildRecordUrl({ baseUrl, apiVersion, entitySetName, recordId });
  const r = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Content-Type': 'application/json; charset=utf-8',
      ...(etag ? { 'If-Match': etag } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new RecordApiError(r.status, await safeText(r));
}

async function safeText(r: Response): Promise<string> {
  try { return await r.text(); } catch { return ''; }
}

/**
 * Extract the D365 error message from an API error body, falling back to the raw text.
 */
export function extractD365ErrorMessage(body: string): string {
  try {
    const j = JSON.parse(body);
    return String(j?.error?.message || j?.Message || body || '').trim();
  } catch {
    return body || '';
  }
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/services/recordDataService.ts
git commit -m "feat(services): add record retrieve and patch with ETag + typed error"
```

---

### Task 4: Field-state merge helpers (pure functions)

Extract the read-only rule + type classification into pure functions so the hook stays testable-by-inspection and the editors stay dumb.

**Files:**
- Create: `src/services/recordFieldMerge.ts`

**Step 1: Write the file**

```ts
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
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/services/recordFieldMerge.ts
git commit -m "feat(services): add record field merge + read-only classification"
```

---

### Task 5: Picklist option loader

Picklist/State/Status editors need `{value, label}` option lists. Fetched on-demand (not up front — keeps the initial modal load fast for entities with many picklists).

**Files:**
- Create: `src/services/picklistOptionsService.ts`

**Step 1: Write the file**

```ts
import { fetchJson } from './d365Api';
import { buildAttributeUrl } from '../utils/urlBuilders';
import { D365_API_VERSION } from '../config/constants';

export interface PicklistOption {
  value: number;
  label: string;
}

const CAST_BY_TYPE: Record<string, string> = {
  Picklist: 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
  State:    'Microsoft.Dynamics.CRM.StateAttributeMetadata',
  Status:   'Microsoft.Dynamics.CRM.StatusAttributeMetadata',
};

export async function loadPicklistOptions(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  attributeType: 'Picklist' | 'State' | 'Status',
  apiVersion: string = D365_API_VERSION
): Promise<PicklistOption[]> {
  const url = buildAttributeUrl({
    baseUrl,
    apiVersion,
    entityLogicalName,
    attributeLogicalName,
    castType: CAST_BY_TYPE[attributeType],
    select: ['LogicalName'],
    expand: 'OptionSet($select=Options)',
  });
  const j = await fetchJson(url) as {
    OptionSet?: {
      Options?: Array<{ Value: number; Label?: { UserLocalizedLabel?: { Label?: string } } }>;
    };
  };
  const opts = j?.OptionSet?.Options || [];
  return opts.map((o) => ({
    value: o.Value,
    label: o.Label?.UserLocalizedLabel?.Label || String(o.Value),
  }));
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/services/picklistOptionsService.ts
git commit -m "feat(services): add picklist options loader (Picklist/State/Status)"
```

---

### Task 6: `useRecordEditor` hook

Orchestrates: parallel fetch of record + metadata, entity set resolution, merge, picklist option loading on demand, dirty tracking, PATCH body assembly, save.

**Files:**
- Create: `src/hooks/useRecordEditor.ts`

**Step 1: Write the file**

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  retrieveRecord,
  patchRecord,
  RecordApiError,
  extractD365ErrorMessage,
  type RetrievedRecord,
} from '../services/recordDataService';
import {
  createResolverCache,
  resolveEntitySet,
  resolveManyToOneNavProps,
  type ResolverCache,
  type NavigationPropertyInfo,
} from '../services/entitySetResolver';
import { listEntityAttributes, type AttributeSummary } from '../services/entityMetadataService';
import { mergeFieldStates, isFieldDirty, type FieldState } from '../services/recordFieldMerge';
import { loadPicklistOptions, type PicklistOption } from '../services/picklistOptionsService';

export interface UseRecordEditorInput {
  clientUrl: string;
  entityLogicalName: string;
  recordId: string;
  apiVersion: string;
}

export interface UseRecordEditorResult {
  loading: boolean;
  error: string | null;
  fields: FieldState[];
  dirtyCount: number;
  saving: boolean;
  saveError: { status?: number; message: string } | null;
  entityLogicalName: string;
  recordId: string;
  updateField: (logicalName: string, value: unknown) => void;
  revertField: (logicalName: string) => void;
  ensureOptions: (logicalName: string) => Promise<void>;
  save: () => Promise<SaveResult>;
  reload: () => Promise<void>;
}

export type SaveResult =
  | { ok: true }
  | { ok: false; status: number; message: string; conflict?: ConflictState };

export interface ConflictState {
  /** Fields whose server value changed since the user opened the modal. */
  conflicts: Array<{ logicalName: string; serverValue: unknown; serverFormatted?: string }>;
  newEtag: string;
}

export function useRecordEditor(input: UseRecordEditorInput): UseRecordEditorResult {
  const { clientUrl, entityLogicalName, recordId, apiVersion } = input;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldState[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ status?: number; message: string } | null>(null);

  const resolverRef = useRef<ResolverCache>(createResolverCache());
  const entitySetRef = useRef<string>('');
  const navPropsRef = useRef<NavigationPropertyInfo[]>([]);
  const attributesRef = useRef<AttributeSummary[]>([]);
  const etagRef = useRef<string>('');
  const pkLogicalNameRef = useRef<string>(`${entityLogicalName}id`);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entitySet = await resolveEntitySet(clientUrl, entityLogicalName, resolverRef.current, apiVersion);
      entitySetRef.current = entitySet;

      const [record, attributes, navProps] = await Promise.all([
        retrieveRecord(clientUrl, entitySet, recordId, apiVersion),
        listEntityAttributes(clientUrl, entityLogicalName, apiVersion),
        resolveManyToOneNavProps(clientUrl, entityLogicalName, resolverRef.current, apiVersion),
      ]);

      attributesRef.current = attributes;
      navPropsRef.current = navProps;
      etagRef.current = record.etag;

      setFields(mergeFieldStates(attributes, record.data, { pkLogicalName: pkLogicalNameRef.current }));
    } catch (e) {
      const msg = e instanceof RecordApiError
        ? friendlyFetchError(e.status, e.body)
        : e instanceof Error ? e.message : String(e);
      setError(msg);
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [clientUrl, entityLogicalName, recordId, apiVersion]);

  useEffect(() => { void load(); }, [load]);

  const updateField = useCallback((logicalName: string, value: unknown) => {
    setFields((prev) => prev.map((f) => f.logicalName === logicalName ? { ...f, currentValue: value } : f));
  }, []);

  const revertField = useCallback((logicalName: string) => {
    setFields((prev) => prev.map((f) => f.logicalName === logicalName ? { ...f, currentValue: f.originalValue } : f));
  }, []);

  const ensureOptions = useCallback(async (logicalName: string) => {
    const field = attributesRef.current.find((a) => a.LogicalName === logicalName);
    if (!field) return;
    const type = field.AttributeType;
    if (type !== 'Picklist' && type !== 'State' && type !== 'Status') return;

    // Skip if already loaded
    const existing = fields.find((f) => f.logicalName === logicalName)?.options;
    if (existing?.length) return;

    const options: PicklistOption[] = await loadPicklistOptions(
      clientUrl, entityLogicalName, logicalName,
      type as 'Picklist' | 'State' | 'Status', apiVersion
    );
    setFields((prev) => prev.map((f) => f.logicalName === logicalName ? { ...f, options } : f));
  }, [fields, clientUrl, entityLogicalName, apiVersion]);

  const buildPatchBody = useCallback((): Record<string, unknown> => {
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.isReadOnly || !isFieldDirty(f)) continue;
      if (f.kind === 'lookup') {
        const nav = navPropsRef.current.find((n) => n.referencingAttribute === f.logicalName);
        if (!nav || !nav.referencedEntitySet) continue; // unresolved nav props were already flagged read-only
        const guid = f.currentValue == null || String(f.currentValue).trim() === ''
          ? null
          : String(f.currentValue).replace(/[{}]/g, '').toLowerCase();
        const key = `${nav.referencingEntityNavigationPropertyName}@odata.bind`;
        body[key] = guid == null ? null : `/${nav.referencedEntitySet}(${guid})`;
      } else {
        body[f.logicalName] = f.currentValue;
      }
    }
    return body;
  }, [fields]);

  const save = useCallback(async (): Promise<SaveResult> => {
    setSaving(true);
    setSaveError(null);
    try {
      const body = buildPatchBody();
      if (Object.keys(body).length === 0) {
        setSaving(false);
        return { ok: true };
      }
      await patchRecord(clientUrl, entitySetRef.current, recordId, body, etagRef.current, apiVersion);
      setSaving(false);
      return { ok: true };
    } catch (e) {
      const status = e instanceof RecordApiError ? e.status : 0;
      const raw = e instanceof RecordApiError ? e.body : e instanceof Error ? e.message : String(e);
      const message = extractD365ErrorMessage(raw) || raw;

      let conflict: ConflictState | undefined;
      if (status === 412) {
        // Re-fetch, compute conflicts.
        try {
          const fresh = await retrieveRecord(clientUrl, entitySetRef.current, recordId, apiVersion);
          const conflicts = findConflicts(fields, fresh);
          etagRef.current = fresh.etag;
          // Refresh formatted values and formatted labels so conflict UI can show them.
          setFields((prev) => mergeWithServerValues(prev, fresh.data));
          conflict = { conflicts, newEtag: fresh.etag };
        } catch { /* swallow — user will see the 412 message */ }
      }

      setSaveError({ status, message });
      setSaving(false);
      return { ok: false, status, message, conflict };
    }
  }, [buildPatchBody, clientUrl, recordId, apiVersion, fields]);

  const dirtyCount = useMemo(
    () => fields.filter((f) => !f.isReadOnly && isFieldDirty(f)).length,
    [fields]
  );

  return {
    loading, error, fields, dirtyCount, saving, saveError,
    entityLogicalName, recordId,
    updateField, revertField, ensureOptions, save, reload: load,
  };
}

function friendlyFetchError(status: number, body: string): string {
  const msg = extractD365ErrorMessage(body);
  if (status === 401 || status === 403) return 'Not authorized. Re-authenticate in D365.';
  if (status === 404) return 'Record not found (it may have been deleted).';
  if (status >= 500) return msg || `Server error (${status}). Try again.`;
  return msg || `Request failed (HTTP ${status}).`;
}

function findConflicts(
  current: FieldState[],
  fresh: RetrievedRecord
): ConflictState['conflicts'] {
  const conflicts: ConflictState['conflicts'] = [];
  for (const f of current) {
    if (f.isReadOnly) continue;
    if (!isFieldDirty(f)) continue;
    const serverKey = f.kind === 'lookup' ? `_${f.logicalName}_value` : f.logicalName;
    const serverValue = (fresh.data as Record<string, unknown>)[serverKey] ?? null;
    if (!valuesEqual(serverValue, f.originalValue)) {
      const formatted = (fresh.data as Record<string, unknown>)[`${serverKey}@OData.Community.Display.V1.FormattedValue`] as string | undefined;
      conflicts.push({ logicalName: f.logicalName, serverValue, serverFormatted: formatted });
    }
  }
  return conflicts;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  return false;
}

function mergeWithServerValues(
  prev: FieldState[],
  fresh: RetrievedRecord
): FieldState[] {
  // Update originalValue to the server's latest for every field; keep user's currentValue.
  return prev.map((f) => {
    const serverKey = f.kind === 'lookup' ? `_${f.logicalName}_value` : f.logicalName;
    const newOriginal = (fresh.data as Record<string, unknown>)[serverKey] ?? null;
    const newFormatted = (fresh.data as Record<string, unknown>)[`${serverKey}@OData.Community.Display.V1.FormattedValue`] as string | undefined;
    return {
      ...f,
      originalValue: newOriginal,
      formattedValue: newFormatted ?? f.formattedValue,
    };
  });
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/hooks/useRecordEditor.ts
git commit -m "feat(hooks): add useRecordEditor orchestration hook"
```

---

### Task 7: `ReadOnlyField.tsx`

**Files:**
- Create: `src/modal/components/editors/ReadOnlyField.tsx`

**Step 1: Write the file**

```tsx
import { Text, tokens, makeStyles } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

const useStyles = makeStyles({
  value: {
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
  },
  empty: { fontStyle: 'italic', color: tokens.colorNeutralForeground3 },
});

export function ReadOnlyField({ field }: { field: FieldState }): JSX.Element {
  const s = useStyles();
  const display = field.formattedValue ?? formatRaw(field.currentValue);
  if (!display) return <Text className={`${s.value} ${s.empty}`}>— empty —</Text>;
  return <Text className={s.value}>{display}</Text>;
}

function formatRaw(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/modal/components/editors/ReadOnlyField.tsx
git commit -m "feat(modal): add ReadOnlyField editor"
```

---

### Task 8: Four simple editors — String, Memo, Number, Boolean

Small and similar; commit them together.

**Files:**
- Create: `src/modal/components/editors/StringEditor.tsx`
- Create: `src/modal/components/editors/MemoEditor.tsx`
- Create: `src/modal/components/editors/NumberEditor.tsx`
- Create: `src/modal/components/editors/BoolEditor.tsx`

**Step 1: Write the editors**

`StringEditor.tsx`:
```tsx
import { Input } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

export function StringEditor({ field, onChange }: Props): JSX.Element {
  const value = field.currentValue == null ? '' : String(field.currentValue);
  return (
    <Input
      value={value}
      onChange={(_e, d) => onChange(d.value === '' ? null : d.value)}
    />
  );
}
```

`MemoEditor.tsx`:
```tsx
import { Textarea } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

export function MemoEditor({ field, onChange }: Props): JSX.Element {
  const value = field.currentValue == null ? '' : String(field.currentValue);
  return (
    <Textarea
      value={value}
      rows={3}
      onChange={(_e, d) => onChange(d.value === '' ? null : d.value)}
    />
  );
}
```

`NumberEditor.tsx`:
```tsx
import { Input } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: number | null) => void;
}

export function NumberEditor({ field, onChange }: Props): JSX.Element {
  const value = field.currentValue == null ? '' : String(field.currentValue);
  const step = field.attributeType === 'Integer' || field.attributeType === 'BigInt' ? '1' : 'any';
  return (
    <Input
      type="number"
      step={step}
      value={value}
      onChange={(_e, d) => {
        if (d.value === '') return onChange(null);
        const n = Number(d.value);
        onChange(Number.isFinite(n) ? n : null);
      }}
    />
  );
}
```

`BoolEditor.tsx`:
```tsx
import { Switch } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: boolean) => void;
}

export function BoolEditor({ field, onChange }: Props): JSX.Element {
  const checked = field.currentValue === true;
  return <Switch checked={checked} onChange={(_e, d) => onChange(d.checked)} />;
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/modal/components/editors/StringEditor.tsx \
        src/modal/components/editors/MemoEditor.tsx \
        src/modal/components/editors/NumberEditor.tsx \
        src/modal/components/editors/BoolEditor.tsx
git commit -m "feat(modal): add String, Memo, Number, Bool editors"
```

---

### Task 9: `DateTimeEditor.tsx`

D365 stores DateTime as ISO 8601. Use native `<input type="datetime-local">` through Fluent `Input` — no extra dependency, matches the "no custom styling" rule.

**Files:**
- Create: `src/modal/components/editors/DateTimeEditor.tsx`

**Step 1: Write the file**

```tsx
import { Input } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

export function DateTimeEditor({ field, onChange }: Props): JSX.Element {
  // `datetime-local` wants "YYYY-MM-DDTHH:mm" (local, no tz).
  // D365 round-trip: parse ISO → render local; on change, convert back to ISO UTC.
  const iso = field.currentValue == null ? '' : String(field.currentValue);
  const local = isoToLocalInput(iso);
  return (
    <Input
      type="datetime-local"
      value={local}
      onChange={(_e, d) => {
        if (!d.value) return onChange(null);
        const asDate = new Date(d.value);
        onChange(Number.isNaN(asDate.getTime()) ? null : asDate.toISOString());
      }}
    />
  );
}

function isoToLocalInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/modal/components/editors/DateTimeEditor.tsx
git commit -m "feat(modal): add DateTime editor"
```

---

### Task 10: `PicklistEditor.tsx`

Uses Fluent `Combobox`. Requests options on focus via `onFocus` callback (hook's `ensureOptions`). Covers Picklist, State, Status.

**Files:**
- Create: `src/modal/components/editors/PicklistEditor.tsx`

**Step 1: Write the file**

```tsx
import { Combobox, Option, Spinner } from '@fluentui/react-components';
import { useCallback, useState } from 'react';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: number | null) => void;
  onRequestOptions: () => Promise<void>;
}

export function PicklistEditor({ field, onChange, onRequestOptions }: Props): JSX.Element {
  const [requesting, setRequesting] = useState(false);

  const maybeLoad = useCallback(async () => {
    if (field.options && field.options.length > 0) return;
    if (requesting) return;
    setRequesting(true);
    try { await onRequestOptions(); } finally { setRequesting(false); }
  }, [field.options, onRequestOptions, requesting]);

  const currentNum = field.currentValue == null ? null : Number(field.currentValue);
  const current = field.options?.find((o) => o.value === currentNum);
  const display = current?.label ?? (field.formattedValue ?? (currentNum == null ? '' : String(currentNum)));

  return (
    <Combobox
      value={display}
      selectedOptions={currentNum == null ? [] : [String(currentNum)]}
      onOpenChange={(_e, data) => { if (data.open) void maybeLoad(); }}
      onOptionSelect={(_e, data) => {
        if (data.optionValue === '__none__') return onChange(null);
        const n = Number(data.optionValue);
        onChange(Number.isFinite(n) ? n : null);
      }}
    >
      <Option value="__none__">— clear —</Option>
      {requesting && <Option value="__loading__" disabled><Spinner size="tiny" /> Loading…</Option>}
      {(field.options || []).map((o) => (
        <Option key={o.value} value={String(o.value)} text={o.label}>{o.label}</Option>
      ))}
    </Combobox>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/modal/components/editors/PicklistEditor.tsx
git commit -m "feat(modal): add Picklist/State/Status editor with lazy option load"
```

---

### Task 11: `LookupEditor.tsx`

Raw GUID input with a helper line showing the target entity.

**Files:**
- Create: `src/modal/components/editors/LookupEditor.tsx`

**Step 1: Write the file**

```tsx
import { Input, Text, tokens, makeStyles } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

const useStyles = makeStyles({
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

export function LookupEditor({ field, onChange }: Props): JSX.Element {
  const s = useStyles();
  const value = field.currentValue == null ? '' : String(field.currentValue);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Input
        value={value}
        placeholder={field.formattedValue ?? 'Enter target record GUID'}
        onChange={(_e, d) => onChange(d.value === '' ? null : d.value)}
      />
      {field.lookupTargetEntity && (
        <Text className={s.hint}>Points to <code>{field.lookupTargetEntity}</code></Text>
      )}
    </div>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/modal/components/editors/LookupEditor.tsx
git commit -m "feat(modal): add Lookup editor (raw GUID)"
```

---

### Task 12: `FieldRow.tsx`

Dispatches to the right editor by `kind`; renders label, read-only value, dirty indicator, revert button.

**Files:**
- Create: `src/modal/components/FieldRow.tsx`

**Step 1: Write the file**

```tsx
import { Button, Text, tokens, makeStyles, Tooltip } from '@fluentui/react-components';
import { ArrowUndo16Regular } from '@fluentui/react-icons';
import type { FieldState } from '../../services/recordFieldMerge';
import { isFieldDirty } from '../../services/recordFieldMerge';
import { ReadOnlyField } from './editors/ReadOnlyField';
import { StringEditor } from './editors/StringEditor';
import { MemoEditor } from './editors/MemoEditor';
import { NumberEditor } from './editors/NumberEditor';
import { BoolEditor } from './editors/BoolEditor';
import { DateTimeEditor } from './editors/DateTimeEditor';
import { PicklistEditor } from './editors/PicklistEditor';
import { LookupEditor } from './editors/LookupEditor';

const useStyles = makeStyles({
  row: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr 32px',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  label: { display: 'flex', flexDirection: 'column' },
  logical: { color: tokens.colorNeutralForeground3, fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  dirty: { color: tokens.colorPaletteYellowForeground1, marginLeft: 4 },
  readOnlyTag: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase100 },
});

interface Props {
  field: FieldState;
  onChange: (value: unknown) => void;
  onRevert: () => void;
  onRequestOptions: () => Promise<void>;
}

export function FieldRow({ field, onChange, onRevert, onRequestOptions }: Props): JSX.Element {
  const s = useStyles();
  const dirty = !field.isReadOnly && isFieldDirty(field);

  return (
    <div className={s.row} data-logical={field.logicalName}>
      <div className={s.label}>
        <Text weight="semibold">
          {field.displayName}
          {dirty && <span className={s.dirty}>●</span>}
        </Text>
        <Text className={s.logical}>
          {field.logicalName}
          {field.isReadOnly && <> · <span className={s.readOnlyTag}>read-only ({field.readOnlyReason ?? 'n/a'})</span></>}
        </Text>
      </div>

      <div>
        {renderEditor(field, onChange, onRequestOptions)}
      </div>

      <div>
        {dirty && (
          <Tooltip content="Revert this field" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowUndo16Regular />}
              onClick={onRevert}
              aria-label="Revert"
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function renderEditor(
  field: FieldState,
  onChange: (value: unknown) => void,
  onRequestOptions: () => Promise<void>,
): JSX.Element {
  if (field.isReadOnly) return <ReadOnlyField field={field} />;
  switch (field.kind) {
    case 'string':   return <StringEditor field={field} onChange={onChange} />;
    case 'memo':     return <MemoEditor field={field} onChange={onChange} />;
    case 'number':   return <NumberEditor field={field} onChange={onChange} />;
    case 'boolean':  return <BoolEditor field={field} onChange={onChange} />;
    case 'datetime': return <DateTimeEditor field={field} onChange={onChange} />;
    case 'picklist': return <PicklistEditor field={field} onChange={onChange} onRequestOptions={onRequestOptions} />;
    case 'lookup':   return <LookupEditor field={field} onChange={onChange} />;
    default:         return <ReadOnlyField field={field} />;
  }
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add src/modal/components/FieldRow.tsx
git commit -m "feat(modal): add FieldRow dispatcher with dirty indicator + revert"
```

---

### Task 13: `RecordEditorModal.tsx` — wire Dialog, search, save, close

Feature-visible shell. No conflict UI yet (Task 19).

**Files:**
- Create: `src/modal/components/RecordEditorModal.tsx`

**Step 1: Write the file**

```tsx
import { useCallback, useMemo, useState } from 'react';
import {
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent,
  Button, Input, Spinner, MessageBar, MessageBarBody, Text, Badge,
  tokens, makeStyles,
} from '@fluentui/react-components';
import { Search20Regular } from '@fluentui/react-icons';
import { useRecordEditor } from '../../hooks/useRecordEditor';
import { FieldRow } from './FieldRow';

const useStyles = makeStyles({
  surface: { maxWidth: '1100px', width: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  body: { flex: 1, minHeight: 0, overflow: 'auto', paddingRight: tokens.spacingHorizontalS },
  toolbar: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center', paddingBottom: tokens.spacingVerticalS },
  search: { flex: 1 },
});

interface Props {
  open: boolean;
  onClose: (didSave: boolean) => void;
  clientUrl: string;
  entity: string;
  recordId: string;
  apiVersion: string;
}

export function RecordEditorModal({ open, onClose, clientUrl, entity, recordId, apiVersion }: Props): JSX.Element {
  const s = useStyles();
  const editor = useRecordEditor({
    clientUrl, entityLogicalName: entity, recordId, apiVersion,
  });

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return editor.fields;
    return editor.fields.filter((f) =>
      f.logicalName.toLowerCase().includes(q) ||
      f.displayName.toLowerCase().includes(q)
    );
  }, [editor.fields, search]);

  const handleClose = useCallback((didSave: boolean) => {
    if (!didSave && editor.dirtyCount > 0) {
      const ok = window.confirm(`Discard ${editor.dirtyCount} unsaved change${editor.dirtyCount > 1 ? 's' : ''}?`);
      if (!ok) return;
    }
    onClose(didSave);
  }, [editor.dirtyCount, onClose]);

  const handleSave = useCallback(async () => {
    const result = await editor.save();
    if (result.ok) onClose(true);
  }, [editor, onClose]);

  return (
    <Dialog open={open} modalType="alert">
      <DialogSurface className={s.surface}>
        <DialogBody>
          <DialogTitle>
            Edit record — <code>{entity}</code> ({editor.recordId})
            {editor.dirtyCount > 0 && <Badge appearance="filled" color="warning" style={{ marginLeft: 8 }}>{editor.dirtyCount} changed</Badge>}
          </DialogTitle>

          <DialogContent>
            {editor.error && (
              <MessageBar intent="error">
                <MessageBarBody>{editor.error}</MessageBarBody>
              </MessageBar>
            )}
            {editor.saveError && (
              <MessageBar intent="error">
                <MessageBarBody>{editor.saveError.message}</MessageBarBody>
              </MessageBar>
            )}

            <div className={s.toolbar}>
              <Input
                className={s.search}
                placeholder="Search by display or logical name…"
                contentBefore={<Search20Regular />}
                value={search}
                onChange={(_e, d) => setSearch(d.value)}
              />
              <Text>{filtered.length} / {editor.fields.length}</Text>
            </div>

            {editor.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner label="Loading record…" />
              </div>
            ) : (
              <div className={s.body}>
                {filtered.map((f) => (
                  <FieldRow
                    key={f.logicalName}
                    field={f}
                    onChange={(v) => editor.updateField(f.logicalName, v)}
                    onRevert={() => editor.revertField(f.logicalName)}
                    onRequestOptions={() => editor.ensureOptions(f.logicalName)}
                  />
                ))}
              </div>
            )}
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={() => handleClose(false)}>Cancel</Button>
            <Button
              appearance="primary"
              disabled={editor.dirtyCount === 0 || editor.saving || editor.loading}
              onClick={handleSave}
            >
              {editor.saving ? 'Saving…' : `Save${editor.dirtyCount > 0 ? ` (${editor.dirtyCount})` : ''}`}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

**Step 3: Commit**

```bash
git add src/modal/components/RecordEditorModal.tsx
git commit -m "feat(modal): add RecordEditorModal shell (search, save, close guard)"
```

---

### Task 14: `ModalApp.tsx` — branch on `mode` param

**Files:**
- Modify: `src/modal/ModalApp.tsx`

**Step 1: Extend `useModalParams` to parse `mode` and `id`**

Inside `useModalParams`, replace the returned object with:
```ts
  return {
    mode: (qs.get('mode') === 'record-editor' ? 'record-editor' : 'translation') as 'record-editor' | 'translation',
    clientUrl: (qs.get('clientUrl') || '').replace(/\/+$/, ''),
    entity: qs.get('entity') || undefined,
    attribute: qs.get('attribute') || undefined,
    recordId: cleanGuid(qs.get('id')),
    formId: cleanGuid(qs.get('formId')),
    labelId: cleanGuid(qs.get('labelId')),
    apiVersion: qs.get('apiVersion') || 'v9.2',
  };
```

**Step 2: Import and branch in the component body**

At the top:
```ts
import { RecordEditorModal } from "./components/RecordEditorModal";
```

Replace the JSX returned at the bottom with a conditional:
```tsx
  const isRecordEditor = mode === 'record-editor';

  // For record editor, send SAVE_COMPLETE before close so parent can refresh form.
  const handleRecordEditorClose = useCallback((didSave: boolean) => {
    if (didSave) {
      window.parent.postMessage({ __d365x__: true, type: 'SAVE_COMPLETE' }, parentOrigin);
    }
    setOpen(false);
    window.parent.postMessage({ __d365x__: true, type: 'CLOSE_FIELD_MODAL' }, parentOrigin);
  }, [parentOrigin]);

  return (
    <FluentProvider theme={theme} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isRecordEditor ? (
        <RecordEditorModal
          open={open}
          onClose={handleRecordEditorClose}
          clientUrl={clientUrl || ''}
          entity={entity || ''}
          recordId={recordId || ''}
          apiVersion={apiVersion}
        />
      ) : (
        <TranslationModal
          open={open}
          onClose={handleClose}
          clientUrl={clientUrl || ''}
          entity={entity || ''}
          attribute={attribute || ''}
          formId={formId}
          labelId={labelId}
          apiVersion={apiVersion}
          onOpenNewTab={handleOpenNewTab}
        />
      )}
    </FluentProvider>
  );
```

Destructure `mode`, `recordId` from `useModalParams()`. Keep the existing title-setting effect; for record editor change the document title:
```ts
  useEffect(() => {
    document.title = isRecordEditor ? `Edit ${entity || 'record'} — D365 Translator` : `${attribute || 'Field'} - D365 Translator`;
  }, [attribute, entity, isRecordEditor]);
```

**Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

**Step 4: Commit**

```bash
git add src/modal/ModalApp.tsx
git commit -m "feat(modal): branch ModalApp on mode param (translation vs record-editor)"
```

---

### Task 15: `relay.ts` — build iframe URL for record editor

**Files:**
- Modify: `src/relay/relay.ts` (add one case inside the existing `window.addEventListener('message', ...)` block)

**Step 1: Insert new case after `OPEN_FIELD_MODAL`**

```ts
    if (d.type === 'OPEN_RECORD_EDITOR_MODAL') {
      const params = new URLSearchParams({
        mode: 'record-editor',
        clientUrl: d.payload.clientUrl || '',
        entity: d.payload.entity || '',
        id: d.payload.id || '',
        apiVersion: d.payload.apiVersion || 'v9.2',
      });
      const iframeUrl = chrome.runtime.getURL(`src/modal/modal.html?${params.toString()}`);
      window.postMessage({
        __d365x__: true,
        type: 'FIELD_MODAL_URL',
        payload: { url: iframeUrl, requestId: d.payload?.requestId }
      }, window.location.origin);
    }
```

**Step 2: Build the extension**

Run: `npm run build`
Expected: clean build, `dist/assets/relay.js` contains the new case (grep `OPEN_RECORD_EDITOR_MODAL` in the built file if unsure).

**Step 3: Commit**

```bash
git add src/relay/relay.ts
git commit -m "feat(relay): forward OPEN_RECORD_EDITOR_MODAL to iframe URL"
```

---

### Task 16: `pageController.ts` — `openRecordEditor` method + SAVE_COMPLETE handler

**Files:**
- Modify: `src/controller/pageController.ts`

**Step 1: Add `openRecordEditor` to the `ctl` type and object**

Find the `ctl` object declaration (line ~39). Add to the type interface:
```ts
    openRecordEditor: () => Promise<void>;
```

Add the method alongside the existing `openAuditHistory` (around line 209):
```ts
    async openRecordEditor() {
      const X = (window as any).Xrm;
      if (!X) { if (__DEV__) console.warn('[ctl] Xrm not found.'); return; }

      const page = await waitFormReady(6000);
      if (!page) { if (__DEV__) console.warn('[ctl] Form not ready.'); return; }

      const entityLogicalName: string = page.data.entity.getEntityName?.() ?? '';
      const rawId: string = page.data.entity.getId?.() ?? '';
      const recordId = rawId.replace(/[{}]/g, '').toLowerCase();
      const clientUrl: string = X?.Utility?.getGlobalContext?.().getClientUrl?.() || '';

      if (!entityLogicalName) {
        alert('Open a record first.');
        return;
      }
      if (!recordId) {
        alert('Save the record before editing its data.');
        return;
      }

      const requestId = crypto.randomUUID();
      const onModalUrl = (ev: MessageEvent) => {
        if (ev.source !== window) return;
        const m = ev.data;
        if (!m || m.__d365x__ !== true || m.type !== 'FIELD_MODAL_URL') return;
        if (m.payload?.requestId !== requestId) return;
        if (typeof m.payload?.url !== 'string' ||
            !/^chrome-extension:\/\/[a-p]{32}\/src\/modal\/modal\.html\?/.test(m.payload.url)) return;
        window.removeEventListener('message', onModalUrl);
        injectFieldModal(m.payload.url);
      };
      window.addEventListener('message', onModalUrl);

      window.postMessage({
        __d365x__: true,
        type: 'OPEN_RECORD_EDITOR_MODAL',
        payload: {
          clientUrl, entity: entityLogicalName, id: recordId,
          apiVersion: getVersion(), requestId,
        },
      }, window.location.origin);
    },
```

**Step 2: Handle `SAVE_COMPLETE` in `injectFieldModal`**

Find `onMessage` inside `injectFieldModal` (line ~1410). Add the new case before the existing `CLOSE_FIELD_MODAL` handling:
```ts
      if (d.type === 'SAVE_COMPLETE') {
        try {
          const X = (window as any).Xrm;
          X?.Page?.data?.refresh?.(false);
        } catch { /* ignore */ }
        // Close will follow via CLOSE_FIELD_MODAL from the iframe
        return;
      }
```

**Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

**Step 4: Commit**

```bash
git add src/controller/pageController.ts
git commit -m "feat(controller): add openRecordEditor + SAVE_COMPLETE refresh handler"
```

---

### Task 17: `useD365Controller.ts` — expose `openRecordEditor`

**Files:**
- Modify: `src/hooks/useD365Controller.ts`
- Modify: `src/types/chromeExtension.ts` — extend `ControllerMethod` union if typed there

**Step 1: Update the `ControllerMethod` type**

Grep: `Grep pattern="type ControllerMethod"` → the file that defines the union. Add `'openRecordEditor'` to it.

**Step 2: Add the hook action**

After `openAuditHistoryPage` (line ~181), add:
```ts
  const openRecordEditor = async (): Promise<void> => {
    setBusy(true);
    setInfo('Opening record editor…');
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, 'openRecordEditor');
      setInfo('Record editor opened.');
      // Close popup so the modal is the focused UI
      window.close();
    });
    setBusy(false);
  };
```

Add `openRecordEditor` to the returned object.

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 4: Commit**

```bash
git add src/hooks/useD365Controller.ts src/types/chromeExtension.ts
git commit -m "feat(hooks): expose openRecordEditor action through useD365Controller"
```

---

### Task 18: Popup button — "Edit Record" in `GeneralTab`

**Files:**
- Modify: `src/popup/constants.ts` — add `editRecord` tooltip
- Modify: `src/popup/components/GeneralTab.tsx` — new ActionButton, new prop
- Modify: `src/popup/App.tsx` — plumb new handler from `useD365Controller`
- Modify: `src/types/popup.ts` — add `editRecord` to `TooltipKey`

**Step 1: Tooltip entry**

In `src/popup/constants.ts`:
```ts
  editRecord: 'Open the current record in a full-field editor. Save only the fields you change.',
```

In `src/types/popup.ts` (find `TooltipKey` via grep), add `'editRecord'` to the union.

**Step 2: New prop + button in `GeneralTab.tsx`**

Add `onEditRecord: () => void` to `GeneralTabProps`, destructure it. Add the button under Quick Actions, after `Show All Fields`:
```tsx
          <ActionButton
            icon={<Edit24Regular />}
            onClick={onEditRecord}
            disabled={busy || !isValidContext || contextChecking}
            onMouseEnter={() => onHoverButton('editRecord')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="editRecord"
          >
            Edit Record
          </ActionButton>
```

Add `Edit24Regular` to the `@fluentui/react-icons` import at the top of the file.

**Step 3: Wire in `App.tsx`**

Destructure `openRecordEditor` from `useD365Controller()`. Pass it as `onEditRecord={openRecordEditor}` to `<GeneralTab ... />`.

**Step 4: Type-check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean.

**Step 5: Commit**

```bash
git add src/popup/constants.ts src/popup/components/GeneralTab.tsx \
        src/popup/App.tsx src/types/popup.ts
git commit -m "feat(popup): add Edit Record button to General tab"
```

---

### Task 19: First end-to-end manual smoke (happy path)

**Files:** none — loading `dist/` in Chrome.

**Prerequisite:** A D365 environment you can PATCH records in (ideally a sandbox). You will edit live data — pick a non-production `account` record.

**Step 1:** Load `dist/` as an unpacked extension in Chrome (`chrome://extensions` → Developer Mode → Load unpacked).

**Step 2:** Open a D365 `account` record form. Click the extension icon → "Edit Record".

**Expected:**
- Modal opens over the form within ~2s.
- Every attribute appears, system fields read-only.
- Console has no errors.

**Step 3:** Edit one String field (e.g., `name`) and one Boolean field (`donotemail` or similar). Confirm `● ` dirty dot appears next to both. Save button shows `Save (2)`.

**Step 4:** Click Save. Watch DevTools Network.

**Expected:**
- Exactly **one** PATCH request to `/accounts(<guid>)`.
- `If-Match` header present.
- Body contains exactly those two fields.
- Response 204.
- Modal closes.
- D365 form visibly refreshes within ~1s showing new values.

**Step 5:** If Step 4 fails, stop and debug before proceeding to Task 20.

**Step 6:** No commit — this is a verification-only task.

---

### Task 20: Conflict/merge UI (412)

Delivers the conflict flow described in the design doc's "Error handling → On save" section.

**Files:**
- Modify: `src/hooks/useRecordEditor.ts` — already returns `saveError.conflict` and the fields already have refreshed `originalValue` after a 412. Expose a dedicated "conflicts" state and a `resolveConflict(field, choice)` action.
- Modify: `src/modal/components/RecordEditorModal.tsx` — render conflict UI when `saveError.conflict` is present.

**Step 1: Extend the hook**

Add to the hook's return type:
```ts
  conflicts: ConflictState | null;
  clearConflict: () => void;
  resolveConflict: (logicalName: string, choice: 'mine' | 'theirs') => void;
```

Add state `const [conflicts, setConflicts] = useState<ConflictState | null>(null);`. In `save()`, after 412 handling, `setConflicts(conflict ?? null);`. Implement:

```ts
  const clearConflict = useCallback(() => setConflicts(null), []);

  const resolveConflict = useCallback((logicalName: string, choice: 'mine' | 'theirs') => {
    if (choice === 'mine') {
      // Keep current user edit; no state change needed beyond removing the conflict entry.
      setConflicts((c) => c ? { ...c, conflicts: c.conflicts.filter((x) => x.logicalName !== logicalName) } : c);
      return;
    }
    // 'theirs' — overwrite currentValue with originalValue (which was just refreshed to server value).
    setFields((prev) => prev.map((f) => f.logicalName === logicalName ? { ...f, currentValue: f.originalValue } : f));
    setConflicts((c) => c ? { ...c, conflicts: c.conflicts.filter((x) => x.logicalName !== logicalName) } : c);
  }, []);
```

**Step 2: Render conflict UI in the modal**

Above the FieldRow list, when `editor.conflicts && editor.conflicts.conflicts.length > 0`:
```tsx
{editor.conflicts && editor.conflicts.conflicts.length > 0 && (
  <MessageBar intent="warning">
    <MessageBarBody>
      <Text weight="semibold">The record was modified since you opened it.</Text>
      <ul>
        {editor.conflicts.conflicts.map((c) => {
          const mine = editor.fields.find((f) => f.logicalName === c.logicalName)?.currentValue;
          return (
            <li key={c.logicalName}>
              <code>{c.logicalName}</code> — server: {String(c.serverFormatted ?? c.serverValue ?? '∅')} / yours: {String(mine ?? '∅')}{' '}
              <Button size="small" onClick={() => editor.resolveConflict(c.logicalName, 'mine')}>Keep mine</Button>{' '}
              <Button size="small" onClick={() => editor.resolveConflict(c.logicalName, 'theirs')}>Take theirs</Button>
            </li>
          );
        })}
      </ul>
      <Text>Resolve each field, then click Save again.</Text>
    </MessageBarBody>
  </MessageBar>
)}
```

**Step 3: Type-check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`

**Step 4: Manual smoke for 412**

Open the modal. In a second browser profile (or incognito), edit the same record's `name` via the D365 UI and save. Return, edit a different field in the modal, Save.

Expected:
- Save fails with the warning MessageBar.
- `name` appears in the conflict list with both values.
- "Keep mine" / "Take theirs" remove the item from the list.
- Clicking Save again PATCHes with the new ETag and succeeds.

**Step 5: Commit**

```bash
git add src/hooks/useRecordEditor.ts src/modal/components/RecordEditorModal.tsx
git commit -m "feat(record-editor): add 412 conflict resolution UI"
```

---

### Task 21: Final verification matrix (design doc Section 6)

**Files:** none — runs entirely in the browser.

**Step 1:** Run the full smoke sequence from `docs/plans/2026-04-21-record-editor-modal-design.md` Section "Testing" (items 1–9). For each, tick it off in a local note. If any step fails, open a new task to fix it before committing.

**Step 2: Pre-PR gates**

Run in order:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

All must be clean.

**Step 3: Verify the regression case (design testing item 9)**

Open the original translation modal (click a highlighted field) and confirm it still works unchanged. This catches any accidental breakage from the `mode` param branching in `ModalApp.tsx`.

**Step 4:** No commit — verification-only.

---

### Task 22: PR prep

**Files:** none — git operations.

**Step 1:** Push the branch.

```bash
git push -u origin feature/data-editor
```

**Step 2:** Open the PR against `main` with a summary drawn from the design doc (architecture + scope + smoke-test list), linking to `docs/plans/2026-04-21-record-editor-modal-design.md` and `docs/plans/2026-04-21-record-editor-modal-plan.md`.

**Step 3:** Do not merge until:
- CodeRabbit + Claude automated reviews are clean or addressed.
- A manual reviewer has completed the checklist in `CODE_REVIEW.md`.

---

## Summary

22 tasks, each small enough to review in isolation:

| # | Focus                          | Files touched |
|--|-|-|
| 0 | Baseline                        | — |
| 1 | `buildRecordUrl`               | 1 |
| 2 | `entitySetResolver`            | 1 |
| 3 | `recordDataService`            | 1 |
| 4 | `recordFieldMerge`             | 1 |
| 5 | `picklistOptionsService`       | 1 |
| 6 | `useRecordEditor`              | 1 |
| 7 | `ReadOnlyField`                | 1 |
| 8 | Four simple editors            | 4 |
| 9 | `DateTimeEditor`               | 1 |
| 10| `PicklistEditor`               | 1 |
| 11| `LookupEditor`                 | 1 |
| 12| `FieldRow`                     | 1 |
| 13| `RecordEditorModal`            | 1 |
| 14| `ModalApp` branching           | 1 |
| 15| `relay` forwarding             | 1 |
| 16| `pageController` method        | 1 |
| 17| `useD365Controller` action     | 2 |
| 18| Popup wiring                   | 4 |
| 19| First manual smoke (E2E)       | — |
| 20| 412 conflict UI                | 2 |
| 21| Full verification matrix       | — |
| 22| PR prep                        | — |

Total: ~20 new files, ~8 modified files. Plan is committed; implementation begins next.
