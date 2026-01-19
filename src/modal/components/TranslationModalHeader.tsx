import { Button } from "@fluentui/react-components";
import { Dismiss20Regular, Open20Regular } from "@fluentui/react-icons";
import { useTranslationModalStyles } from "./translationModalStyles";

export interface TranslationModalHeaderProps {
  attribute: string;
  entity: string;
  onClose: () => void;
  onOpenNewTab?: () => void;
}

export function TranslationModalHeader({
  attribute,
  entity,
  onClose,
  onOpenNewTab,
}: TranslationModalHeaderProps) {
  const styles = useTranslationModalStyles();

  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <h2 className={styles.headerTitle}>{attribute}</h2>
        <div className={styles.headerSubtitle}>{entity}</div>
      </div>
      <div className={styles.headerActions}>
        {onOpenNewTab && (
          <Button
            appearance="subtle"
            icon={<Open20Regular />}
            onClick={onOpenNewTab}
            title="Open in new tab"
          />
        )}
        <Button
          appearance="subtle"
          icon={<Dismiss20Regular />}
          onClick={onClose}
          title="Close"
        />
      </div>
    </div>
  );
}
