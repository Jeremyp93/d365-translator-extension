import { useMemo, useState, useEffect, type SetStateAction } from "react";
import {
  Card,
  CardHeader,
  Text,
  Divider,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

import Button from "./ui/Button";
import { Info, ErrorBox } from "./ui/Notice";
import TranslationsTable from "./TranslationsTable";
import TranslationsTableSkeleton from "./TranslationsTableSkeleton";
import { useLanguages } from "../hooks/useLanguages";
import {
  readFormFieldLabelsAllLcids,
  saveFormFieldLabelsAllLcids,
} from "../services/formLabelService";
import { publishEntityViaWebApi } from "../services/d365Api";
import { spacing } from "../styles/theme";

const useStyles = makeStyles({
  root: {
    padding: spacing.md,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
    marginBottom: spacing.sm,
    fontSize: tokens.fontSizeBase200,
  },
  actions: {
    display: "flex",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionGap: {
    marginTop: spacing.md,
  },
});

export interface FormLabelEditorProps {
  clientUrl: string;
  entity: string;
  attribute: string;
  formId: string; // lowercase/stripped {}
  labelId: string; // lowercase/stripped {}
  /** Set to true to make all inputs read-only (e.g., editing blocked, save in progress) */
  readOnly?: boolean;
  /** Auto-load form labels on mount (default: false) */
  autoLoad?: boolean;
  /** Form values state (controlled from parent for session caching) */
  formValues?: Record<number, string>;
  /** Form values state setter */
  setFormValues?: (values: SetStateAction<Record<number, string>>) => void;
  /** Has loaded table state (controlled from parent for session caching) */
  hasLoadedTable?: boolean;
  /** Has loaded table state setter */
  setHasLoadedTable?: (loaded: boolean) => void;
}

export default function FormLabelEditor({
  clientUrl,
  entity,
  attribute,
  formId,
  labelId,
  readOnly = false,
  autoLoad = false,
  formValues: controlledFormValues,
  setFormValues: controlledSetFormValues,
  hasLoadedTable: controlledHasLoadedTable,
  setHasLoadedTable: controlledSetHasLoadedTable,
}: FormLabelEditorProps): JSX.Element {
  const styles = useStyles();

  // Load provisioned languages once
  const { langs, error: langsError } = useLanguages(clientUrl);
  const langList = useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs]
  );

  // Values per LCID - use controlled state if provided, otherwise local state
  const [localFormValues, setLocalFormValues] = useState<Record<number, string>>({});
  const formValues = controlledFormValues ?? localFormValues;
  const setFormValues = controlledSetFormValues ?? setLocalFormValues;

  // UI state
  const [busyLoad, setBusyLoad] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only show table once the user explicitly loads the labels - use controlled state if provided
  const [localHasLoadedTable, setLocalHasLoadedTable] = useState(false);
  const hasLoadedTable = controlledHasLoadedTable ?? localHasLoadedTable;
  const setHasLoadedTable = controlledSetHasLoadedTable ?? setLocalHasLoadedTable;

  const compositeError = error || langsError || null;

  // Auto-load form labels on mount if autoLoad is enabled
  useEffect(() => {
    if (autoLoad && !hasLoadedTable && !busyLoad && langList.length > 0) {
      onLoadFormLabels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, hasLoadedTable, busyLoad, langList.length]);

  const onFormChange = (lcid: number, value: string) => {
    setFormValues((prev) => ({ ...prev, [lcid]: value }));
  };

  const onLoadFormLabels = async () => {
    try {
      if (!formId) throw new Error("Missing formId.");
      if (!labelId) throw new Error("Missing labelId.");
      if (!langList.length)
        throw new Error("No provisioned languages loaded yet.");

      setBusyLoad(true);
      setInfo("Reading form labels for all languages…");
      setError(null);

      // Read per LCID by temporarily switching the user's UI language (service encapsulates that)
      const rows = await readFormFieldLabelsAllLcids(
        clientUrl,
        formId,
        attribute,
        labelId,
        langList
      );
      const map: Record<number, string> = {};
      for (const { lcid, label } of rows) map[lcid] = label ?? "";
      setFormValues(map);
      setHasLoadedTable(true);
      setInfo("Form labels loaded.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setInfo(null);
      setHasLoadedTable(false);
    } finally {
      setBusyLoad(false);
    }
  };

  const onSaveFormLabels = async () => {
    try {
      if (!formId) throw new Error("Missing formId.");
      if (!labelId) throw new Error("Missing labelId.");
      if (!Object.keys(formValues).length) throw new Error("Nothing to save.");

      setBusySave(true);
      setInfo("Saving form labels (per language)…");
      setError(null);

      await saveFormFieldLabelsAllLcids(
        clientUrl,
        formId,
        attribute,
        labelId,
        formValues
      );
      setInfo("Publishing…");
      await publishEntityViaWebApi(clientUrl, entity);

      setInfo(
        "Form labels saved. If the app still shows old text, hard refresh (Ctrl/Cmd+Shift+R)."
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setInfo(null);
    } finally {
      setBusySave(false);
    }
  };

  return (
    <Card className={styles.root}>
      <CardHeader
        header={
          <Text weight="semibold">Form labels (control label per LCID)</Text>
        }
      />

      {compositeError && <ErrorBox>{compositeError}</ErrorBox>}
      {!compositeError && info && <Info>{info}</Info>}

      <Divider className={styles.sectionGap} />
      {busyLoad ? (
        <TranslationsTableSkeleton rows={langList.length || 5} />
      ) : hasLoadedTable ? (
        <TranslationsTable
          lcids={langList}
          values={formValues}
          loading={false}
          disabled={!formId || !labelId || readOnly}
          placeholder="(empty)"
          onChange={onFormChange}
        />
      ) : (
        <Info>
          Click "Load Form Labels" to fetch translations for each language.
        </Info>
      )}

      {!autoLoad && (
        <div className={styles.actions}>
          <Button
            onClick={onLoadFormLabels}
            disabled={!formId || !labelId || busyLoad || busySave || readOnly}
            variant="ghost"
          >
            {busyLoad ? "Loading…" : "Load Form Labels"}
          </Button>
          <Button
            onClick={onSaveFormLabels}
            disabled={!formId || !labelId || busyLoad || busySave || readOnly}
            variant="primary"
          >
            {busySave ? "Saving…" : "Save Form Labels"}
          </Button>
        </div>
      )}
      {autoLoad && (
        <div className={styles.actions}>
          <Button
            onClick={onSaveFormLabels}
            disabled={!formId || !labelId || busyLoad || busySave || readOnly}
            variant="primary"
          >
            {busySave ? "Saving…" : "Save Form Labels"}
          </Button>
        </div>
      )}
    </Card>
  );
}
