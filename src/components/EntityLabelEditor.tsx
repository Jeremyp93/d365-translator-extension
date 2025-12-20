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
  updateAttributeLabelsViaWebApi,
} from "../services/entityLabelService";
import { publishEntityViaWebApi } from "../services/d365Api";
import type { PendingChange } from "../types";

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
  /** Enable bulk mode: changes are added to cart instead of immediate save */
  bulkMode?: boolean;
  /** Callback when changes are added to cart (bulk mode only) */
  onAddToCart?: (changes: PendingChange[]) => void;
  /** Trigger to reload data from D365 (for bulk mode after save) */
  reloadTrigger?: number;
  /** Pending changes for this attribute (bulk mode only) - to restore edits when navigating back */
  pendingChanges?: PendingChange[];
}

interface Label {
  languageCode: number;
  label: string;
}

export default function EntityLabelEditor({
  clientUrl,
  entity,
  attribute,
  bulkMode = false,
  onAddToCart,
  reloadTrigger,
  pendingChanges = [],
}: Props): JSX.Element {
  const styles = useStyles();
  const { langs, error: langsError } = useLanguages(clientUrl);
  // Derive loading: no langs yet and no error from the hook
  const langsLoading = !langs && !langsError;

  const [values, setValues] = useState<Editable>({});
  const [originalValues, setOriginalValues] = useState<Editable>({}); // Track original for bulk mode
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

        // Apply pending changes on top of D365 values (restore user edits when navigating back)
        const valuesWithPendingChanges = { ...map };
        pendingChanges.forEach((change) => {
          if (change.entity === entity && change.attribute === attribute) {
            valuesWithPendingChanges[change.languageCode] = change.newValue;
          }
        });

        if (!cancelled) {
          setValues(valuesWithPendingChanges);
          setOriginalValues(map); // Store original D365 values for comparison (not the edited ones)
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
  }, [clientUrl, entity, attribute, lcids.join(","), reloadTrigger, pendingChanges.length]); // re-run if langs change, reload triggered, or pending changes added/removed

  const onChange = (lcid: number, v: string) => {
    setValues((prev) => ({ ...prev, [lcid]: v }));
  };

  // Immediate save handler (default mode)
  const handleImmediateSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setInfo("Saving…");

      const labels = lcids.map((lcid) => ({
        LanguageCode: lcid,
        Label: values[lcid] ?? "",
      }));
      await updateAttributeLabelsViaWebApi(clientUrl, entity, attribute, labels);

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

  // Add to cart handler (bulk mode)
  const handleAddToCart = () => {
    if (!onAddToCart) return;

    // Calculate changes: compare current values with original values
    const changes: PendingChange[] = [];
    lcids.forEach((lcid) => {
      const oldValue = originalValues[lcid] ?? "";
      const newValue = values[lcid] ?? "";

      // Only add if value actually changed
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
      setInfo("No changes to add to cart");
      setTimeout(() => setInfo(null), 2000);
      return;
    }

    // Call the callback with changes
    onAddToCart(changes);

    // DO NOT update originalValues here - keep the D365 values as baseline
    // This allows user to:
    // 1. Make changes → add to cart
    // 2. Clear cart or remove changes
    // 3. Still see the same diff from D365 (not from last "add to cart")

    // Show success feedback
    setInfo(`Added ${changes.length} translation${changes.length > 1 ? 's' : ''} to cart`);
    setTimeout(() => setInfo(null), 2000);
  };

  const handleSave = bulkMode ? handleAddToCart : handleImmediateSave;
  const buttonLabel = bulkMode ? "Add to Cart" : (saving ? "Saving…" : "Save & Publish");

  return (
    <Card className={styles.root}>
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
          onClick={handleSave}
          disabled={saving || !langs?.length}
          variant="primary"
        >
          {buttonLabel}
        </Button>
      </div>
    </Card>
  );
}
