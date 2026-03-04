import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getAttributeLabelTranslations,
  updateAttributeLabelsViaWebApi,
} from "../services/entityLabelService";
import {
  readFormFieldLabelsAllLcids,
  saveFormFieldLabelsAllLcids,
} from "../services/formLabelService";
import { publishEntityViaWebApi } from "../services/d365Api";

type TabValue = "entity" | "form" | "optionset";

interface OptionSetHandle {
  changes: unknown[];
  save: () => Promise<void>;
  discard: () => void;
}

interface UseTranslationModalDataParams {
  clientUrl: string;
  entity: string;
  attribute: string;
  formId?: string;
  labelId?: string;
  apiVersion: string;
  langs: number[] | null;
  activeTab: TabValue;
  optionSet: OptionSetHandle;
}

export interface TranslationModalData {
  entityValues: Record<number, string>;
  entityOriginalValues: Record<number, string>;
  entityLoading: boolean;
  entityError: string | null;
  entityChanges: [string, string][];
  handleEntityValueChange: (lcid: number, value: string) => void;

  formValues: Record<number, string>;
  formOriginalValues: Record<number, string>;
  formLoading: boolean;
  formError: string | null;
  formLoaded: boolean;
  formChanges: [string, string][];
  handleFormValueChange: (lcid: number, value: string) => void;

  totalChangeCount: number;
  saving: boolean;
  saveError: string | null;
  handleSave: () => Promise<void>;
  handleDiscard: () => void;
}

export function useTranslationModalData({
  clientUrl,
  entity,
  attribute,
  formId,
  labelId,
  apiVersion,
  langs,
  activeTab,
  optionSet,
}: UseTranslationModalDataParams): TranslationModalData {
  // Entity translations
  const [entityValues, setEntityValues] = useState<Record<number, string>>({});
  const [entityOriginalValues, setEntityOriginalValues] = useState<Record<number, string>>({});
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);

  // Form translations
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [formOriginalValues, setFormOriginalValues] = useState<Record<number, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoaded, setFormLoaded] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load entity labels on mount
  useEffect(() => {
    if (!clientUrl || !entity || !attribute || !langs || langs.length === 0) {
      return;
    }

    let cancelled = false;
    setEntityLoading(true);
    setEntityError(null);

    (async () => {
      try {
        const labels = await getAttributeLabelTranslations(clientUrl, entity, attribute);
        if (cancelled) return;

        const valuesMap: Record<number, string> = {};
        labels.forEach((l) => {
          valuesMap[l.languageCode] = l.label;
        });

        langs.forEach((lcid) => {
          if (!(lcid in valuesMap)) {
            valuesMap[lcid] = "";
          }
        });

        setEntityValues(valuesMap);
        setEntityOriginalValues({ ...valuesMap });
      } catch (e: unknown) {
        if (!cancelled) {
          setEntityError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setEntityLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientUrl, entity, attribute, langs]);

  // Load form labels when tab is clicked
  const loadFormLabels = useCallback(async () => {
    if (!clientUrl || !formId || !labelId || !langs || langs.length === 0 || formLoaded) {
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const labelsArray = await readFormFieldLabelsAllLcids(
        clientUrl,
        formId,
        attribute,
        labelId,
        langs
      );

      const valuesMap: Record<number, string> = {};
      labelsArray.forEach((item) => {
        valuesMap[item.lcid] = item.label;
      });

      langs.forEach((lcid) => {
        if (!(lcid in valuesMap)) {
          valuesMap[lcid] = "";
        }
      });

      setFormValues(valuesMap);
      setFormOriginalValues({ ...valuesMap });
      setFormLoaded(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormLoading(false);
    }
  }, [clientUrl, formId, labelId, attribute, langs, formLoaded]);

  // Load form labels when switching to form tab
  const hasFormTab = Boolean(formId && labelId);
  useEffect(() => {
    if (activeTab === "form" && hasFormTab && !formLoaded) {
      loadFormLabels();
    }
  }, [activeTab, hasFormTab, formLoaded, loadFormLabels]);

  // Change detection
  const entityChanges = useMemo(() => {
    return Object.entries(entityValues).filter(
      ([lcid, val]) => val !== entityOriginalValues[Number(lcid)]
    );
  }, [entityValues, entityOriginalValues]);

  const formChanges = useMemo(() => {
    return Object.entries(formValues).filter(
      ([lcid, val]) => val !== formOriginalValues[Number(lcid)]
    );
  }, [formValues, formOriginalValues]);

  const totalChangeCount = entityChanges.length + formChanges.length + optionSet.changes.length;

  // Handlers
  const handleEntityValueChange = useCallback((lcid: number, value: string) => {
    setEntityValues((prev) => ({ ...prev, [lcid]: value }));
  }, []);

  const handleFormValueChange = useCallback((lcid: number, value: string) => {
    setFormValues((prev) => ({ ...prev, [lcid]: value }));
  }, []);

  const handleDiscard = useCallback(() => {
    if (activeTab === "entity") {
      setEntityValues({ ...entityOriginalValues });
    } else if (activeTab === "form") {
      setFormValues({ ...formOriginalValues });
    } else if (activeTab === "optionset") {
      optionSet.discard();
    }
    setSaveError(null);
  }, [activeTab, entityOriginalValues, formOriginalValues, optionSet]);

  const handleSave = useCallback(async () => {
    if (totalChangeCount === 0) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (activeTab === "entity" && entityChanges.length > 0) {
        const labels: { LanguageCode: number; Label: string }[] = Object.entries(entityValues).map(
          ([lcid, label]) => ({
            LanguageCode: Number(lcid),
            Label: label,
          })
        );

        await updateAttributeLabelsViaWebApi(clientUrl, entity, attribute, labels);
        await publishEntityViaWebApi(clientUrl, entity);
        setEntityOriginalValues({ ...entityValues });
      }

      if (activeTab === "form" && formChanges.length > 0 && formId && labelId) {
        await saveFormFieldLabelsAllLcids(clientUrl, formId, attribute, labelId, formValues);
        await publishEntityViaWebApi(clientUrl, entity);
        setFormOriginalValues({ ...formValues });
      }

      if (activeTab === "optionset" && optionSet.changes.length > 0) {
        await optionSet.save();
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [totalChangeCount, activeTab, entityChanges, entityValues, formChanges, formValues, clientUrl, entity, attribute, formId, labelId, optionSet]);

  return {
    entityValues,
    entityOriginalValues,
    entityLoading,
    entityError,
    entityChanges,
    handleEntityValueChange,

    formValues,
    formOriginalValues,
    formLoading,
    formError,
    formLoaded,
    formChanges,
    handleFormValueChange,

    totalChangeCount,
    saving,
    saveError,
    handleSave,
    handleDiscard,
  };
}
