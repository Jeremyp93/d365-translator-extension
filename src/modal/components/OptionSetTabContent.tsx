import { Spinner, MessageBar, MessageBarBody, Text } from "@fluentui/react-components";
import { OptionSetCard } from "./OptionSetCard";
import { useTranslationModalStyles } from "./translationModalStyles";
import type { OptionSetMetadata } from "../../types";

interface OptionSetTabContentProps {
  langs: number[];
  baseLcid: number | null;
  isDisabled: boolean;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  metadata: OptionSetMetadata | null;
  values: Record<number, Record<number, string>>;
  originalValues: Record<number, Record<number, string>>;
  onChange: (optionValue: number, lcid: number, value: string) => void;
}

export function OptionSetTabContent({
  langs,
  baseLcid,
  isDisabled,
  loading,
  error,
  loaded,
  metadata,
  values,
  originalValues,
  onChange,
}: OptionSetTabContentProps) {
  const styles = useTranslationModalStyles();

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" />
        <Text>Loading option set values...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  if (!loaded || !metadata || metadata.options.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text>No options defined for this option set.</Text>
      </div>
    );
  }

  return (
    <div className={styles.cardsContainer}>
      {metadata.options.map((opt) => (
        <OptionSetCard
          key={opt.value}
          optionValue={opt.value}
          baseLabel={
            opt.labels.find((l) => l.languageCode === baseLcid)?.label ||
            opt.labels[0]?.label ||
            ""
          }
          langs={langs}
          baseLcid={baseLcid ?? undefined}
          values={values[opt.value] || {}}
          originalValues={originalValues[opt.value] || {}}
          disabled={isDisabled}
          onChange={(lcid, value) => onChange(opt.value, lcid, value)}
        />
      ))}
    </div>
  );
}
