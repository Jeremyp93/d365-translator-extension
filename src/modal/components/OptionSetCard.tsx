import { Badge, Input } from "@fluentui/react-components";
import { getLanguageDisplayNameWithoutLcid } from "../../utils/languageNames";
import { useOptionSetCardStyles } from "./translationModalStyles";

export interface OptionSetCardProps {
  optionValue: number;
  baseLabel: string;
  langs: number[];
  baseLcid: number | undefined;
  values: Record<number, string>;
  originalValues: Record<number, string>;
  disabled: boolean;
  onChange: (lcid: number, value: string) => void;
}

export function OptionSetCard({
  optionValue,
  baseLabel,
  langs,
  baseLcid,
  values,
  originalValues,
  disabled,
  onChange,
}: OptionSetCardProps) {
  const styles = useOptionSetCardStyles();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Badge appearance="tint" size="large">
          {optionValue}
        </Badge>
        <span className={styles.optionLabel}>{baseLabel || "(no label)"}</span>
      </div>
      <div className={styles.rows}>
        {langs.map((lcid) => {
          const val = values[lcid] ?? "";
          const orig = originalValues[lcid] ?? "";
          const isModified = val !== orig;
          const isBase = lcid === baseLcid;
          const langName = getLanguageDisplayNameWithoutLcid(lcid);

          return (
            <div key={lcid} className={styles.row}>
              <div className={styles.rowLangInfo}>
                <span className={styles.rowLangName}>{langName}</span>
                <span className={styles.rowLcidBadge}>{lcid}</span>
              </div>
              <Input
                className={styles.rowInput}
                value={val}
                onChange={(_, data) => onChange(lcid, data.value)}
                disabled={disabled}
                size="medium"
                appearance="outline"
              />
              <div className={styles.rowBadges}>
                {isModified && <span className={styles.modifiedDot} />}
                {isBase && <span className={styles.baseBadge}>BASE</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
