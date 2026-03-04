import { useState, useCallback, useMemo } from "react";
import {
  getOptionSetMetadata,
  saveOptionSetLabels,
} from "../services/optionSetService";
import type { OptionSetMetadata } from "../types";

type EditableOptions = Record<number, Record<number, string>>;

interface UseOptionSetTranslationsResult {
  metadata: OptionSetMetadata | null;
  values: EditableOptions;
  originalValues: EditableOptions;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  saving: boolean;
  saveError: string | null;
  changes: Array<[number, number]>;
  load: () => Promise<void>;
  onChange: (optionValue: number, lcid: number, value: string) => void;
  save: () => Promise<void>;
  discard: () => void;
  reset: () => void;
}

export function useOptionSetTranslations(
  clientUrl: string,
  entity: string,
  attribute: string,
  langs: number[] | undefined,
  apiVersion: string = "v9.2"
): UseOptionSetTranslationsResult {
  const [metadata, setMetadata] = useState<OptionSetMetadata | null>(null);
  const [values, setValues] = useState<EditableOptions>({});
  const [originalValues, setOriginalValues] = useState<EditableOptions>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientUrl || !entity || !attribute || !langs || langs.length === 0 || loaded) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const meta = await getOptionSetMetadata(clientUrl, entity, attribute, apiVersion);

      const valuesMap: EditableOptions = {};
      meta.options.forEach((opt) => {
        valuesMap[opt.value] = {};
        const allLcids = new Set<number>([
          ...langs,
          ...opt.labels.map((l) => l.languageCode),
        ]);
        Array.from(allLcids).forEach((lcid) => {
          const hit = opt.labels.find((l) => l.languageCode === lcid);
          valuesMap[opt.value][lcid] = hit?.label ?? "";
        });
      });

      setMetadata(meta);
      setValues(valuesMap);
      setOriginalValues(structuredClone(valuesMap));
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [clientUrl, entity, attribute, langs, apiVersion, loaded]);

  const onChange = useCallback((optionValue: number, lcid: number, value: string) => {
    setValues((prev) => ({
      ...prev,
      [optionValue]: {
        ...(prev[optionValue] || {}),
        [lcid]: value,
      },
    }));
  }, []);

  const changes = useMemo(() => {
    const changed: Array<[number, number]> = [];
    for (const optVal of Object.keys(values).map(Number)) {
      for (const lcid of Object.keys(values[optVal] || {}).map(Number)) {
        if ((values[optVal]?.[lcid] ?? "") !== (originalValues[optVal]?.[lcid] ?? "")) {
          changed.push([optVal, lcid]);
        }
      }
    }
    return changed;
  }, [values, originalValues]);

  const save = useCallback(async () => {
    if (!metadata || changes.length === 0) return;

    setSaving(true);
    setSaveError(null);

    try {
      await saveOptionSetLabels(
        clientUrl,
        entity,
        attribute,
        values,
        metadata.isGlobal,
        metadata.name ?? undefined
      );
      setOriginalValues(structuredClone(values));
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [clientUrl, entity, attribute, metadata, values, changes]);

  const discard = useCallback(() => {
    setValues(structuredClone(originalValues));
    setSaveError(null);
  }, [originalValues]);

  const reset = useCallback(() => {
    setMetadata(null);
    setValues({});
    setOriginalValues({});
    setLoading(false);
    setError(null);
    setLoaded(false);
    setSaving(false);
    setSaveError(null);
  }, []);

  return {
    metadata,
    values,
    originalValues,
    loading,
    error,
    loaded,
    saving,
    saveError,
    changes,
    load,
    onChange,
    save,
    discard,
    reset,
  };
}
