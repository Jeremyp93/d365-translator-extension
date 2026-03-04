import { Spinner, MessageBar, MessageBarBody, Text } from "@fluentui/react-components";
import { LanguageCard } from "./LanguageCard";
import { useTranslationModalStyles } from "./translationModalStyles";

interface EntityTabContentProps {
  langs: number[];
  baseLcid: number | null;
  entityLoading: boolean;
  entityError: string | null;
  entityValues: Record<number, string>;
  entityOriginalValues: Record<number, string>;
  isDisabled: boolean;
  onValueChange: (lcid: number, value: string) => void;
}

export function EntityTabContent({
  langs,
  baseLcid,
  entityLoading,
  entityError,
  entityValues,
  entityOriginalValues,
  isDisabled,
  onValueChange,
}: EntityTabContentProps) {
  const styles = useTranslationModalStyles();

  if (entityLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" />
        <Text>Loading entity labels...</Text>
      </div>
    );
  }

  if (entityError) {
    return (
      <div className={styles.errorContainer}>
        <MessageBar intent="error">
          <MessageBarBody>{entityError}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={styles.cardsContainer}>
      {langs.map((lcid) => (
        <LanguageCard
          key={lcid}
          lcid={lcid}
          value={entityValues[lcid] || ""}
          originalValue={entityOriginalValues[lcid] || ""}
          isBase={lcid === baseLcid}
          disabled={isDisabled}
          onChange={(value) => onValueChange(lcid, value)}
        />
      ))}
    </div>
  );
}
