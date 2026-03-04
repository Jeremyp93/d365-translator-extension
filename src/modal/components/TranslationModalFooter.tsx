import { Button, CounterBadge, Spinner } from "@fluentui/react-components";
import { Save20Regular, ArrowUndo20Regular } from "@fluentui/react-icons";
import { useTranslationModalStyles } from "./translationModalStyles";

export interface TranslationModalFooterProps {
  changeCount: number;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function TranslationModalFooter({
  changeCount,
  saving,
  onSave,
  onDiscard,
}: TranslationModalFooterProps) {
  const styles = useTranslationModalStyles();
  const hasChanges = changeCount > 0;

  if (!hasChanges && !saving) {
    return null;
  }

  return (
    <div className={styles.footer}>
      <div>
        {hasChanges && (
          <CounterBadge
            count={changeCount}
            appearance="filled"
            color="informative"
            size="medium"
          />
        )}
      </div>
      <div className={styles.footerActions}>
        <Button
          appearance="subtle"
          icon={<ArrowUndo20Regular />}
          onClick={onDiscard}
          disabled={!hasChanges || saving}
        >
          Discard
        </Button>
        <Button
          appearance="primary"
          icon={saving ? <Spinner size="tiny" /> : <Save20Regular />}
          onClick={onSave}
          disabled={!hasChanges || saving}
        >
          {saving ? "Saving..." : `Save Changes${hasChanges ? ` (${changeCount})` : ""}`}
        </Button>
      </div>
    </div>
  );
}
