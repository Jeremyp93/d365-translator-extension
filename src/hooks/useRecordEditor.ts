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
  conflicts: ConflictState | null;
  clearConflict: () => void;
  resolveConflict: (logicalName: string, choice: 'mine' | 'theirs') => void;
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
  const [conflicts, setConflicts] = useState<ConflictState | null>(null);

  const resolverRef = useRef<ResolverCache>(createResolverCache());
  const entitySetRef = useRef<string>('');
  const navPropsRef = useRef<NavigationPropertyInfo[]>([]);
  const attributesRef = useRef<AttributeSummary[]>([]);
  const etagRef = useRef<string>('');

  const load = useCallback(async () => {
    const pkLogicalName = `${entityLogicalName}id`;
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

      const merged = mergeFieldStates(attributes, record.data, { pkLogicalName });
      const writableLookupAttrs = new Set(
        navProps.filter((n) => n.referencedEntitySet).map((n) => n.referencingAttribute)
      );
      setFields(
        merged.map((f) =>
          f.kind === 'lookup' && !f.isReadOnly && !writableLookupAttrs.has(f.logicalName)
            ? { ...f, isReadOnly: true, readOnlyReason: 'no-nav-prop' }
            : f
        )
      );
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
      setConflicts(null);
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
          setFields((prev) => mergeWithServerValues(prev, fresh));
          conflict = { conflicts, newEtag: fresh.etag };
        } catch { /* swallow — user will see the 412 message */ }
      }

      setConflicts(conflict ?? null);
      setSaveError({ status, message });
      setSaving(false);
      return { ok: false, status, message, conflict };
    }
  }, [buildPatchBody, clientUrl, recordId, apiVersion, fields]);

  const dirtyCount = useMemo(
    () => fields.filter((f) => !f.isReadOnly && isFieldDirty(f)).length,
    [fields]
  );

  const clearConflict = useCallback(() => setConflicts(null), []);

  const resolveConflict = useCallback((logicalName: string, choice: 'mine' | 'theirs') => {
    if (choice === 'mine') {
      setConflicts((c) => c ? { ...c, conflicts: c.conflicts.filter((x) => x.logicalName !== logicalName) } : c);
      return;
    }
    setFields((prev) => prev.map((f) => f.logicalName === logicalName ? { ...f, currentValue: f.originalValue } : f));
    setConflicts((c) => c ? { ...c, conflicts: c.conflicts.filter((x) => x.logicalName !== logicalName) } : c);
  }, []);

  return {
    loading, error, fields, dirtyCount, saving, saveError,
    entityLogicalName, recordId,
    updateField, revertField, ensureOptions, save, reload: load,
    conflicts, clearConflict, resolveConflict,
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
