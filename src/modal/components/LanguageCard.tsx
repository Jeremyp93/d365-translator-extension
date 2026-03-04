import { Input } from "@fluentui/react-components";
import { getLanguageDisplayNameWithoutLcid } from "../../utils/languageNames";
import { useLanguageCardStyles } from "./translationModalStyles";

export interface LanguageCardProps {
  lcid: number;
  value: string;
  originalValue: string;
  isBase: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function LanguageCard({
  lcid,
  value,
  originalValue,
  isBase,
  disabled,
  onChange,
}: LanguageCardProps) {
  const styles = useLanguageCardStyles();
  const languageName = getLanguageDisplayNameWithoutLcid(lcid);
  const isModified = value !== originalValue;

  return (
    <div className={`${styles.card} ${disabled ? styles.cardDisabled : ""}`}>
      <div className={styles.cardHeader}>
        <div className={styles.languageInfo}>
          <span className={styles.languageName}>{languageName}</span>
          <span className={styles.lcidBadge}>{lcid}</span>
        </div>
        <div className={styles.badges}>
          {isModified && (
            <div className={styles.modifiedIndicator}>
              <span className={styles.modifiedDot} />
              modified
            </div>
          )}
          {isBase && <span className={styles.baseBadge}>BASE</span>}
        </div>
      </div>
      <div className={styles.inputWrapper}>
        <Input
          value={value}
          onChange={(_, data) => onChange(data.value)}
          disabled={disabled}
          size="medium"
          appearance="outline"
          className={styles.input}
        />
      </div>
    </div>
  );
}
