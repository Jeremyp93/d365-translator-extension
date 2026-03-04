import { Spinner, MessageBar, MessageBarBody, Text } from "@fluentui/react-components";
import { LanguageCard } from "./LanguageCard";
import { useTranslationModalStyles } from "./translationModalStyles";

interface FormTabContentProps {
  langs: number[];
  baseLcid: number | null;
  formLoading: boolean;
  formError: string | null;
  formLoaded: boolean;
  formValues: Record<number, string>;
  formOriginalValues: Record<number, string>;
  isDisabled: boolean;
  onValueChange: (lcid: number, value: string) => void;
}

export function FormTabContent({
  langs,
  baseLcid,
  formLoading,
  formError,
  formLoaded,
  formValues,
  formOriginalValues,
  isDisabled,
  onValueChange,
}: FormTabContentProps) {
  const styles = useTranslationModalStyles();

  if (formLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" />
        <Text>Loading form labels...</Text>
      </div>
    );
  }

  if (formError) {
    return (
      <div className={styles.errorContainer}>
        <MessageBar intent="error">
          <MessageBarBody>{formError}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  if (!formLoaded) {
    return (
      <div className={styles.emptyState}>
        <Text>Click the Form Labels tab to load form translations</Text>
      </div>
    );
  }

  return (
    <div className={styles.cardsContainer}>
      {langs.map((lcid) => (
        <LanguageCard
          key={lcid}
          lcid={lcid}
          value={formValues[lcid] || ""}
          originalValue={formOriginalValues[lcid] || ""}
          isBase={lcid === baseLcid}
          disabled={isDisabled}
          onChange={(value) => onValueChange(lcid, value)}
        />
      ))}
    </div>
  );
}
