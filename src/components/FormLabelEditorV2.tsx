import { useMemo, useState, useEffect } from "react";
import { Text, Divider } from "@fluentui/react-components";
import { FormRegular } from "@fluentui/react-icons";

import Button from "./ui/Button";
import InlineNotice from "./ui/InlineNotice";
import TranslationsTableV2 from "./TranslationsTableV2";
import { useLanguages } from "../hooks/useLanguages";
import {
  readFormFieldLabelsAllLcids,
  saveFormFieldLabelsAllLcids,
} from "../services/formLabelService";
import { publishEntityViaWebApi } from "../services/d365Api";
import { useEditorStyles, editorThemes } from "./editors/editorStyles";

export interface FormLabelEditorV2Props {
  clientUrl: string;
  entity: string;
  attribute: string;
  formId: string;
  labelId: string;
  /** Set to true to make all inputs read-only (e.g., editing blocked, save in progress) */
  readOnly?: boolean;
  /** Auto-load form labels on mount (default: false) */
  autoLoad?: boolean;
  /** Form values state (controlled from parent for session caching) */
  formValues?: Record<number, string>;
  /** Form values state setter */
  setFormValues?: (values: Record<number, string>) => void;
  /** Has loaded table state (controlled from parent for session caching) */
  hasLoadedTable?: boolean;
  /** Has loaded table state setter */
  setHasLoadedTable?: (loaded: boolean) => void;
}

export default function FormLabelEditorV2({
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
}: FormLabelEditorV2Props): JSX.Element {
  const styles = useEditorStyles();
  const theme = editorThemes.form;

  const { langs, error: langsError } = useLanguages(clientUrl);
  const langList = useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs]
  );

  const [localFormValues, setLocalFormValues] = useState<Record<number, string>>({});
  const formValues = controlledFormValues ?? localFormValues;
  const setFormValues = controlledSetFormValues ?? setLocalFormValues;

  const [busyLoad, setBusyLoad] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localHasLoadedTable, setLocalHasLoadedTable] = useState(false);
  const hasLoadedTable = controlledHasLoadedTable ?? localHasLoadedTable;
  const setHasLoadedTable = controlledSetHasLoadedTable ?? setLocalHasLoadedTable;

  const compositeError = error || langsError || null;

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
    <div
      className={styles.editorContainer}
      style={{ borderLeftColor: theme.borderColor }}
    >
      {/* Header */}
      <div className={styles.editorHeader}>
        <div
          className={styles.iconWrapper}
          style={{ backgroundColor: theme.iconWrapperBg }}
        >
          <FormRegular style={{ color: theme.iconColor, fontSize: "24px" }} />
        </div>
        <div className={styles.headerTextContainer}>
          <Text className={styles.headerTitle}>Form Control Labels</Text>
          <Text className={styles.headerSubtitle}>
            Label per language in form XML
          </Text>
        </div>
      </div>

      {/* Notices */}
      {compositeError && (
        <InlineNotice variant="error">{compositeError}</InlineNotice>
      )}
      {!compositeError && info && (
        <InlineNotice variant="info">{info}</InlineNotice>
      )}

      {/* Content */}
      <Divider className={styles.contentDivider} />

      {hasLoadedTable || busyLoad ? (
        <TranslationsTableV2
          lcids={langList}
          values={formValues}
          loading={busyLoad}
          disabled={!formId || !labelId || readOnly}
          placeholder="(empty)"
          onChange={onFormChange}
        />
      ) : (
        <div className={styles.emptyState}>
          <Text>Click "Load Form Labels" to begin</Text>
        </div>
      )}

      {/* Actions */}
      {!autoLoad && (
        <div className={styles.editorActions}>
          <Button
            className={styles.actionButton}
            onClick={onLoadFormLabels}
            disabled={!formId || !labelId || busyLoad || busySave || readOnly}
            variant="ghost"
          >
            {busyLoad ? "Loading…" : "Load Form Labels"}
          </Button>
          <Button
            className={styles.actionButton}
            onClick={onSaveFormLabels}
            disabled={!formId || !labelId || busyLoad || busySave || readOnly}
            variant="primary"
          >
            {busySave ? "Saving…" : "Save Form Labels"}
          </Button>
        </div>
      )}
      {autoLoad && (
        <div className={styles.editorActions}>
          <Button
            className={styles.actionButton}
            onClick={onSaveFormLabels}
            disabled={!formId || !labelId || busyLoad || busySave || readOnly}
            variant="primary"
          >
            {busySave ? "Saving…" : "Save Form Labels"}
          </Button>
        </div>
      )}
    </div>
  );
}
