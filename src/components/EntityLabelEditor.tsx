import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Text,
  Divider,
  Card,
  CardHeader,
  makeStyles,
} from "@fluentui/react-components";
import TranslationsTable from "../components/TranslationsTable";
import Button from "./ui/Button";
import { ErrorBox, Info } from "./ui/Notice";
import { useLanguages } from "../hooks/useLanguages";
import {
  getAttributeLabelTranslations,
  updateAttributeLabelsViaSoap,
} from "../services/entityLabelService";
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

type Editable = Record<number, string>;

interface Props {
  clientUrl: string;
  entity: string;
  attribute: string;
}

interface Label {
  languageCode: number;
  label: string;
}

export default function EntityLabelEditor({
  clientUrl,
  entity,
  attribute,
}: Props): JSX.Element {
  const styles = useStyles();
  const { langs, error: langsError } = useLanguages(clientUrl);
  // Derive loading: no langs yet and no error from the hook
  const langsLoading = !langs && !langsError;

  const [values, setValues] = useState<Editable>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const lcids = useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setInfo("Loading labels…");
        setLoading(true);

        const labels = await getAttributeLabelTranslations(
          clientUrl,
          entity,
          attribute
        );
        const map: Editable = {};
        const allLcids = new Set<number>([
          ...lcids,
          ...labels.map((l) => Number(l.languageCode)),
        ]);
        Array.from(allLcids).forEach((lcid) => {
          const hit = labels.find((l) => Number(l.languageCode) === lcid);
          map[lcid] = hit?.label ?? "";
        });

        if (!cancelled) {
          setValues(map);
          setInfo(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientUrl, entity, attribute, lcids.join(",")]); // re-run if langs change

  const onChange = (lcid: number, v: string) => {
    setValues((prev) => ({ ...prev, [lcid]: v }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setInfo("Saving…");

      const labels = lcids.map((lcid) => ({
        LanguageCode: lcid,
        Label: values[lcid] ?? "",
      }));
      await updateAttributeLabelsViaSoap(clientUrl, entity, attribute, labels);

      setInfo("Publishing…");
      await publishEntityViaWebApi(clientUrl, entity);

      setInfo(
        "Saved & published. If you still see old text, hard refresh (Ctrl/Cmd+Shift+R)."
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={styles.root} style={{ backgroundColor: "var(--colorNeutralBackgroundStatic)" }}>
      <CardHeader
        header={
          <Text weight="semibold">DisplayName labels (Entity metadata)</Text>
        }
      />

      {error && (
        <div style={{ marginTop: 10 }}>
          <ErrorBox>Error: {error}</ErrorBox>
        </div>
      )}
      {info && !error && (
        <div style={{ marginTop: 10 }}>
          <Info>{info}</Info>
        </div>
      )}

      <Divider className={styles.sectionGap} />

      <TranslationsTable
        lcids={lcids}
        values={values}
        loading={langsLoading || loading}
        disabled={!langs || !langs.length}
        placeholder="(empty)"
        onChange={(lcid, v) => onChange(lcid, v)}
      />

      <div className={styles.actions}>
        <Button
          onClick={onSave}
          disabled={saving || !langs?.length}
          variant="primary"
        >
          {saving ? "Saving…" : "Save & Publish"}
        </Button>
      </div>
    </Card>
  );
}
