import { useEffect, useMemo, useState } from "react";
import { Text, Divider } from "@fluentui/react-components";
import { Database24Regular } from "@fluentui/react-icons";

import TranslationsTableV2 from "./TranslationsTableV2";
import Button from "./ui/Button";
import InlineNotice from "./ui/InlineNotice";
import { useLanguages } from "../hooks/useLanguages";
import {
  getAttributeLabelTranslations,
  updateAttributeLabelsViaWebApi,
} from "../services/entityLabelService";
import { publishEntityViaWebApi } from "../services/d365Api";
import type { PendingChange } from "../types";
import { useEditorStyles, editorThemes } from "./editors/editorStyles";

type Editable = Record<number, string>;

interface Props {
  clientUrl: string;
  entity: string;
  attribute: string;
  /** Enable bulk mode: changes are added to cart instead of immediate save */
  bulkMode?: boolean;
  /** Callback when changes are added to cart (bulk mode only) */
  onAddToCart?: (changes: PendingChange[]) => void;
  /** Trigger to reload data from D365 (for bulk mode after save) */
  reloadTrigger?: number;
  /** Pending changes for this attribute (bulk mode only) - to restore edits when navigating back */
  pendingChanges?: PendingChange[];
  /** Set to true to make all inputs read-only (e.g., editing blocked, external save in progress) */
  readOnly?: boolean;
}

export default function EntityLabelEditorV2({
  clientUrl,
  entity,
  attribute,
  bulkMode = false,
  onAddToCart,
  reloadTrigger,
  pendingChanges = [],
  readOnly = false,
}: Props): JSX.Element {
  const styles = useEditorStyles();
  const theme = editorThemes.entity;
  const { langs, error: langsError } = useLanguages(clientUrl);
  const langsLoading = !langs && !langsError;

  const [values, setValues] = useState<Editable>({});
  const [originalValues, setOriginalValues] = useState<Editable>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const lcids = useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs]
  );

  const pendingChangesKey = useMemo(
    () => JSON.stringify(pendingChanges),
    [pendingChanges]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
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

        const valuesWithPendingChanges = { ...map };
        pendingChanges.forEach((change) => {
          if (change.entity === entity && change.attribute === attribute) {
            valuesWithPendingChanges[change.languageCode] = change.newValue;
          }
        });

        if (!cancelled) {
          setValues(valuesWithPendingChanges);
          setOriginalValues(map);
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
  }, [
    clientUrl,
    entity,
    attribute,
    lcids.join(","),
    reloadTrigger,
    pendingChangesKey,
  ]);

  const onChange = (lcid: number, v: string) => {
    setValues((prev) => ({ ...prev, [lcid]: v }));
  };

  const handleImmediateSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setInfo("Saving…");

      const labels: { LanguageCode: number; Label: string }[] = [];
      lcids.forEach((lcid) => {
        const oldValue = originalValues[lcid] ?? "";
        const newValue = values[lcid] ?? "";

        if (oldValue !== newValue) {
          labels.push({
            LanguageCode: lcid,
            Label: newValue,
          });
        }
      });

      if (labels.length === 0) {
        setInfo("No changes to save");
        setSaving(false);
        return;
      }

      await updateAttributeLabelsViaWebApi(
        clientUrl,
        entity,
        attribute,
        labels
      );

      setInfo("Publishing…");
      await publishEntityViaWebApi(clientUrl, entity);

      setOriginalValues({ ...values });

      setInfo(
        "Saved & published. If you still see old text, hard refresh (Ctrl/Cmd+Shift+R)."
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleAddToCart = () => {
    if (!onAddToCart) return;

    const changes: PendingChange[] = [];
    lcids.forEach((lcid) => {
      const oldValue = originalValues[lcid] ?? "";
      const newValue = values[lcid] ?? "";

      if (oldValue !== newValue) {
        changes.push({
          entity,
          attribute,
          languageCode: lcid,
          oldValue,
          newValue,
          timestamp: Date.now(),
        });
      }
    });

    if (changes.length === 0) {
      setInfo("No changes detected");
      setTimeout(() => setInfo(null), 2000);
      return;
    }

    onAddToCart(changes);

    setInfo(
      `Added ${changes.length} translation${
        changes.length > 1 ? "s" : ""
      } to the changes`
    );
    setTimeout(() => setInfo(null), 2000);
  };

  const handleSave = bulkMode ? handleAddToCart : handleImmediateSave;
  const buttonLabel = bulkMode
    ? "Add to Changes"
    : saving
    ? "Saving…"
    : "Save & Publish";

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
          <Database24Regular style={{ color: theme.iconColor }} />
        </div>
        <div className={styles.headerTextContainer}>
          <Text className={styles.headerTitle}>Entity Field Labels</Text>
          <Text className={styles.headerSubtitle}>
            DisplayName metadata across all languages
          </Text>
        </div>
      </div>

      {/* Notices */}
      {error && <InlineNotice variant="error">{error}</InlineNotice>}
      {info && !error && <InlineNotice variant="info">{info}</InlineNotice>}

      {/* Content */}
      <Divider className={styles.contentDivider} />

      <TranslationsTableV2
        lcids={lcids}
        values={values}
        loading={langsLoading || loading}
        disabled={!langs || !langs.length || saving || readOnly}
        placeholder="(empty)"
        onChange={(lcid, v) => onChange(lcid, v)}
      />

      {/* Actions */}
      <div className={styles.editorActions}>
        <Button
          className={styles.actionButton}
          onClick={handleSave}
          disabled={saving || !langs?.length || readOnly}
          variant="primary"
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
