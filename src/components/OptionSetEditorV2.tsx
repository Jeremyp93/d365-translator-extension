import { useEffect, useMemo, useState } from "react";
import { Text, Divider, Badge } from "@fluentui/react-components";
import { Options24Regular } from "@fluentui/react-icons";

import TranslationsTableV2 from "./TranslationsTableV2";
import Button from "./ui/Button";
import InlineNotice from "./ui/InlineNotice";
import { useLanguages } from "../hooks/useLanguages";
import {
  getOptionSetMetadata,
  saveOptionSetLabels,
} from "../services/optionSetService";
import type { OptionSetMetadata } from "../types";
import { useEditorStyles, editorThemes } from "./editors/editorStyles";
import { spacing } from "../styles/theme";

type EditableOptions = Record<number, Record<number, string>>; // optionValue -> lcid -> label

interface Props {
  clientUrl: string;
  entity: string;
  attribute: string;
  apiVersion?: string;
  /** Set to true to make all inputs read-only (e.g., editing blocked, save in progress) */
  readOnly?: boolean;
}

export default function OptionSetEditorV2({
  clientUrl,
  entity,
  attribute,
  apiVersion = "v9.2",
  readOnly = false,
}: Props): JSX.Element {
  const styles = useEditorStyles();
  const theme = editorThemes.optionSet;
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setInfo("Loading option set…");
        setLoading(true);

        const meta = await getOptionSetMetadata(
          clientUrl,
          entity,
          attribute,
          apiVersion
        );

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
  }, [clientUrl, entity, attribute, lcids.join(","), apiVersion]);

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
          <Options24Regular style={{ color: theme.iconColor }} />
        </div>
        <div className={styles.headerTextContainer}>
          <div className={styles.headerBadgeContainer}>
            <Text className={styles.headerTitle}>OptionSet Options</Text>
            {metadata?.isGlobal && (
              <Badge color="informative" appearance="filled" size="small">
                Global: {metadata.name}
              </Badge>
            )}
          </div>
          <Text className={styles.headerSubtitle}>
            {metadata?.isGlobal
              ? "Shared across multiple fields"
              : "Local to this field"}
          </Text>
        </div>
      </div>

      {/* Notices */}
      {error && <InlineNotice variant="error">{error}</InlineNotice>}
      {info && !error && <InlineNotice variant="info">{info}</InlineNotice>}

      {/* Content */}
      <Divider className={styles.contentDivider} />

      {metadata && metadata.options.length > 0 && (
        <div className={styles.tableWrapper}>
          {metadata.options.map((option, index) => (
            <div key={option.value}>
              {index > 0 && <Divider style={{ margin: `${spacing.md} 0` }} />}
              <div className={styles.optionRow}>
                <div className={styles.optionHeader}>
                  <Badge appearance="tint" size="large">
                    {option.value}
                  </Badge>
                  <Text className={styles.optionLabel}>
                    {option.labels.find((l) => l.languageCode === langs?.[0])
                      ?.label ||
                      option.labels[0]?.label ||
                      "N/A"}
                  </Text>
                </div>

                <TranslationsTableV2
                  lcids={lcids}
                  values={values[option.value] || {}}
                  loading={langsLoading || loading}
                  disabled={!langs || !langs.length || readOnly}
                  placeholder="(empty)"
                  onChange={(lcid, v) => onChange(option.value, lcid, v)}
                  compact={true}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {metadata && metadata.options.length === 0 && (
        <div className={styles.emptyState}>
          <Text>No options defined for this option set.</Text>
        </div>
      )}

      {/* Actions */}
      <div className={styles.editorActions}>
        <Button
          className={styles.actionButton}
          onClick={onSave}
          disabled={saving || !langs?.length || !metadata || readOnly}
          variant="primary"
        >
          {saving ? "Saving…" : "Save & Publish"}
        </Button>
      </div>
    </div>
  );
}
