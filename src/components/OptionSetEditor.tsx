import { useEffect, useMemo, useState } from "react";
import {
  Text,
  Divider,
  Card,
  CardHeader,
  makeStyles,
  Badge,
  Link,
} from "@fluentui/react-components";

import TranslationsTable from "./TranslationsTable";
import Button from "./ui/Button";
import { ErrorBox, Info } from "./ui/Notice";
import { useLanguages } from "../hooks/useLanguages";
import {
  getOptionSetMetadata,
  saveOptionSetLabels,
} from "../services/optionSetService";
import type { OptionSetMetadata, OptionValue } from "../types";

const useStyles = makeStyles({
  root: {
    padding: "12px",
    marginTop: "12px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  badge: {
    marginLeft: "8px",
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
  optionRow: {
    marginBottom: "16px",
  },
  optionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  optionValue: {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#6a737d",
  },
  tableWrapper: {
    maxHeight: "400px",
    overflowY: "auto",
  },
});

type EditableOptions = Record<number, Record<number, string>>; // optionValue -> lcid -> label

interface Props {
  clientUrl: string;
  entity: string;
  attribute: string;
  apiVersion?: string;
  /** Set to true to make all inputs read-only (e.g., editing blocked, save in progress) */
  readOnly?: boolean;
}

export default function OptionSetEditor({
  clientUrl,
  entity,
  attribute,
  apiVersion = 'v9.2',
  readOnly = false,
}: Props): JSX.Element {
  const styles = useStyles();
  const { langs, error: langsError } = useLanguages(clientUrl, apiVersion);
  const langsLoading = !langs && !langsError;

  const [metadata, setMetadata] = useState<OptionSetMetadata | null>(null);
  const [values, setValues] = useState<EditableOptions>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const lcids = useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs]
  );

  // Load OptionSet metadata and options
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setInfo("Loading option set…");
        setLoading(true);

        const meta = await getOptionSetMetadata(clientUrl, entity, attribute, apiVersion);
        
        // Build values map
        const valuesMap: EditableOptions = {};
        meta.options.forEach((opt) => {
          valuesMap[opt.value] = {};
          const allLcids = new Set<number>([
            ...lcids,
            ...opt.labels.map((l) => l.languageCode),
          ]);
          Array.from(allLcids).forEach((lcid) => {
            const hit = opt.labels.find((l) => l.languageCode === lcid);
            valuesMap[opt.value][lcid] = hit?.label ?? "";
          });
        });

        if (!cancelled) {
          setMetadata(meta);
          setValues(valuesMap);
          setInfo(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientUrl, entity, attribute, lcids.join(",")]);

  const onChange = (optionValue: number, lcid: number, v: string) => {
    setValues((prev) => ({
      ...prev,
      [optionValue]: {
        ...(prev[optionValue] || {}),
        [lcid]: v,
      },
    }));
  };

  const onSave = async () => {
    if (!metadata) return;

    try {
      setSaving(true);
      setError(null);
      setInfo("Saving option set labels…");

      await saveOptionSetLabels(
        clientUrl,
        entity,
        attribute,
        values,
        metadata.isGlobal,
        metadata.name ?? undefined
      );

      setInfo(
        metadata.isGlobal
          ? "Saved. Global option set changes are automatically published."
          : "Saved & published. If you still see old text, hard refresh (Ctrl/Cmd+Shift+R)."
      );
    } catch (e: any) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!metadata && !loading && !error) {
    return <></>;
  }

  return (
    <Card className={styles.root}>
      <CardHeader
        header={
          <div className={styles.header}>
            <Text weight="semibold">OptionSet Options</Text>
            {metadata?.isGlobal ? (
              <Badge color="informative" appearance="filled" className={styles.badge}>
                Global OptionSet: {metadata.name}
              </Badge>
            ) : (
              <Badge color="subtle" appearance="outline" className={styles.badge}>
                Local OptionSet
              </Badge>
            )}
          </div>
        }
        description={
          metadata?.isGlobal ? (
            <Text size={200}>
              This is a global option set shared across multiple fields.{" "}
              <Link href={`#/report/global-optionsets?clientUrl=${encodeURIComponent(clientUrl)}&apiVersion=${encodeURIComponent(apiVersion)}&name=${metadata.name}`}>
                Manage in Global OptionSet Manager
              </Link>
            </Text>
          ) : (
            <Text size={200}>This is a local option set specific to this field.</Text>
          )
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

      {metadata && metadata.options.length > 0 && (
        <div className={styles.tableWrapper}>
          {metadata.options.map((option) => (
            <div key={option.value} className={styles.optionRow}>
              <div className={styles.optionHeader}>
                <Text weight="semibold">Option {option.value}</Text>
                <Text className={styles.optionValue}>
                  (Base: {option.labels.find((l) => l.languageCode === langs?.[0])?.label || 
                    option.labels[0]?.label || "N/A"})
                </Text>
              </div>
              
              <TranslationsTable
                lcids={lcids}
                values={values[option.value] || {}}
                loading={langsLoading || loading}
                disabled={!langs || !langs.length || readOnly}
                placeholder="(empty)"
                onChange={(lcid, v) => onChange(option.value, lcid, v)}
              />
            </div>
          ))}
        </div>
      )}

      {metadata && metadata.options.length === 0 && (
        <Text>No options defined for this option set.</Text>
      )}

      <div className={styles.actions}>
        <Button
          onClick={onSave}
          disabled={saving || !langs?.length || !metadata || readOnly}
          variant="primary"
        >
          {saving ? "Saving…" : "Save & Publish"}
        </Button>
      </div>
    </Card>
  );
}
