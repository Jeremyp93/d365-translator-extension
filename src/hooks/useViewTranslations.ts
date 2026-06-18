import { useState, useCallback, useMemo, useRef } from 'react';
import {
  getViewLocalizedLabels,
  saveViewTranslations,
  type ViewLabelEdit,
} from '../services/savedQueryService';

export type ViewField = 'name' | 'description';
export type ViewFieldValues = Record<ViewField, Record<number, string>>;

const EMPTY: ViewFieldValues = { name: {}, description: {} };

interface UseViewTranslationsResult {
  values: ViewFieldValues;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  hasChanges: boolean;
  load: () => Promise<void>;
  onChange: (field: ViewField, lcid: number, value: string) => void;
  save: () => Promise<void>;
  reset: () => void;
}

function seed(langs: number[], labels: { languageCode: number; label: string }[]): Record<number, string> {
  const out: Record<number, string> = {};
  const all = new Set<number>([...langs, ...labels.map((l) => l.languageCode)]);
  all.forEach((lcid) => {
    out[lcid] = labels.find((l) => l.languageCode === lcid)?.label ?? '';
  });
  return out;
}

export function useViewTranslations(
  clientUrl: string,
  entity: string,
  savedQueryId: string | null,
  langs: number[] | undefined,
  apiVersion: string = 'v9.2'
): UseViewTranslationsResult {
  const [values, setValues] = useState<ViewFieldValues>(EMPTY);
  const [original, setOriginal] = useState<ViewFieldValues>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const loadVersionRef = useRef(0);

  const load = useCallback(async () => {
    if (!clientUrl || !savedQueryId || !langs?.length) return;
    const version = ++loadVersionRef.current;
    setLoading(true);
    setError(null);
    setLoaded(false);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const [nameLabels, descLabels] = await Promise.all([
        getViewLocalizedLabels(clientUrl, savedQueryId, 'name', apiVersion),
        getViewLocalizedLabels(clientUrl, savedQueryId, 'description', apiVersion),
      ]);
      if (loadVersionRef.current !== version) return;
      const next: ViewFieldValues = {
        name: seed(langs, nameLabels),
        description: seed(langs, descLabels),
      };
      setValues(next);
      setOriginal(structuredClone(next));
      setLoaded(true);
    } catch (e: unknown) {
      if (loadVersionRef.current !== version) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (loadVersionRef.current === version) setLoading(false);
    }
  }, [clientUrl, savedQueryId, langs, apiVersion]);

  const onChange = useCallback((field: ViewField, lcid: number, value: string) => {
    setSaveSuccess(false);
    setValues((prev) => ({ ...prev, [field]: { ...prev[field], [lcid]: value } }));
  }, []);

  const changedEdits = useMemo<ViewLabelEdit[]>(() => {
    const fields: ViewField[] = ['name', 'description'];
    return fields.map((field) => ({
      attributeName: field,
      labels: Object.keys(values[field])
        .map(Number)
        .filter((lcid) => (values[field][lcid] ?? '') !== (original[field][lcid] ?? ''))
        .map((lcid) => ({ languageCode: lcid, label: values[field][lcid] ?? '' })),
    })).filter((e) => e.labels.length > 0);
  }, [values, original]);

  const hasChanges = changedEdits.length > 0;

  const save = useCallback(async () => {
    if (!savedQueryId || !hasChanges) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await saveViewTranslations(clientUrl, entity, savedQueryId, changedEdits, apiVersion);
      setOriginal(structuredClone(values));
      setSaveSuccess(true);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [clientUrl, entity, savedQueryId, changedEdits, hasChanges, values, apiVersion]);

  const reset = useCallback(() => {
    setValues(EMPTY);
    setOriginal(EMPTY);
    setLoaded(false);
    setError(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  return { values, loading, error, loaded, saving, saveError, saveSuccess, hasChanges, load, onChange, save, reset };
}
