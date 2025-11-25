import { useCallback, useMemo, useState } from 'react';
import { readFormFieldLabelsAllLcids, saveFormFieldLabelsAllLcids } from '../services/formLabelService';

export interface UseFormLabelsState {
  values: Record<number, string>;   // lcid -> label
  loading: boolean;
  saving: boolean;
  error: string | null;
  info: string | null;
}

export interface UseFormLabelsApi {
  state: UseFormLabelsState;
  setValue: (lcid: number, text: string) => void;
  load: () => Promise<void>;
  save: () => Promise<void>;
  resetError: () => void;
  resetInfo: () => void;
}

/**
 * Hook to read & write a single field's form label (specific cell by labelId) across LCIDs.
 * - No duplication: relies on formLabelService (which in turn uses d365api).
 */
export function useFormLabels(params: {
  baseUrl: string;
  formId: string;                 // systemform id (guid without braces)
  attributeLogicalName: string;
  labelId: string;                // <cell id="..."> that hosts the control
  lcids: number[];                // provisioned LCIDs to work with
}): UseFormLabelsApi {
  const { baseUrl, formId, attributeLogicalName, labelId, lcids } = params;

  const [values, setValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const setValue = useCallback((lcid: number, text: string) => {
    setValues(prev => ({ ...prev, [lcid]: text }));
  }, []);

  const load = useCallback(async () => {
    if (!formId || !labelId || !lcids?.length) return;
    setLoading(true);
    setError(null);
    setInfo('Reading form labels…');

    try {
      const rows = await readFormFieldLabelsAllLcids(baseUrl, formId, attributeLogicalName, labelId, lcids);
      const next: Record<number, string> = {};
      for (const { lcid, label } of rows) next[lcid] = label ?? '';
      // Ensure we have all LCIDs present even if empty
      for (const lcid of lcids) if (!(lcid in next)) next[lcid] = '';
      setValues(next);
      setInfo('Form labels loaded.');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, formId, attributeLogicalName, labelId, lcids]);

  const save = useCallback(async () => {
    if (!formId || !labelId) return;
    setSaving(true);
    setError(null);
    setInfo('Saving form labels…');

    try {
      await saveFormFieldLabelsAllLcids(baseUrl, formId, attributeLogicalName, labelId, values);
      setInfo('Form labels saved. If you still see old text, hard refresh (Ctrl/Cmd+Shift+R).');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setInfo(null);
    } finally {
      setSaving(false);
    }
  }, [baseUrl, formId, attributeLogicalName, labelId, values]);

  const state: UseFormLabelsState = useMemo(() => ({
    values, loading, saving, error, info
  }), [values, loading, saving, error, info]);

  return { state, setValue, load, save, resetError: () => setError(null), resetInfo: () => setInfo(null) };
}
