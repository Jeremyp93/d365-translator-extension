import * as React from "react";
import {
  Card,
  CardHeader,
  Text,
  Divider,
  makeStyles,
} from "@fluentui/react-components";
import Button from "./ui/Button";
import { Info, ErrorBox } from "./ui/Notice";
import TranslationsTable from "./TranslationsTable";
import { useLanguages } from "../hooks/useLanguages";
import {
  readFormFieldLabelsAllLcids,
  saveFormFieldLabelsAllLcids,
} from "../services/formLabelService";
import { publishEntityViaWebApi } from "../services/d365Api";

const useStyles = makeStyles({
  root: {
    padding: "12px",
  },
  meta: {
    color: "#6a737d",
    marginBottom: "8px",
    fontSize: "12px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  sectionGap: {
    marginTop: "12px",
  },
});

export interface FormLabelEditorProps {
  clientUrl: string;
  entity: string;
  attribute: string;
  formId: string; // lowercase/stripped {}
  labelId: string; // lowercase/stripped {}
}

export default function FormLabelEditor({
  clientUrl,
  entity,
  attribute,
  formId,
  labelId,
}: FormLabelEditorProps): JSX.Element {
  const styles = useStyles();

  // Load provisioned languages once
  const { langs, error: langsError } = useLanguages(clientUrl);
  const langList = React.useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs]
  );

  // Values per LCID
  const [formValues, setFormValues] = React.useState<Record<number, string>>(
    {}
  );

  // UI state
  const [busyLoad, setBusyLoad] = React.useState(false);
  const [busySave, setBusySave] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Only show table once the user explicitly loads the labels
  const [hasLoadedTable, setHasLoadedTable] = React.useState(false);

  const compositeError = error || langsError || null;

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
      {hasLoadedTable || busyLoad ? (
        <TranslationsTable
          lcids={langList}
          values={formValues}
          loading={busyLoad}
          disabled={!formId || !labelId}
          placeholder="(empty)"
          onChange={onFormChange}
        />
      ) : (
        <Info>
          Click “Load Form Labels” to fetch translations for each language.
        </Info>
      )}

      <div className={styles.actions}>
        <Button
          onClick={onLoadFormLabels}
          disabled={!formId || !labelId || busyLoad || busySave}
          variant="ghost"
        >
          {busyLoad ? "Loading…" : "Load Form Labels"}
        </Button>
        <Button
          onClick={onSaveFormLabels}
          disabled={!formId || !labelId || busyLoad || busySave}
          variant="primary"
        >
          {busySave ? "Saving…" : "Save Form Labels"}
        </Button>
      </div>
    </Card>
  );
}
