import { useMemo, useState } from "react";
import {
  Input,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens,
  Badge,
} from "@fluentui/react-components";
import { Globe20Regular } from "@fluentui/react-icons";

import TranslationsTableSkeleton from "./TranslationsTableSkeleton";
import { getLanguageDisplayNameWithoutLcid } from "../utils/languageNames";
import { spacing } from "../styles/theme";

const useStyles = makeStyles({
  container: {
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
  },
  compactContainer: {
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    width: "100%",
    minWidth: "600px",
  },
  stickyHeader: {
    position: "sticky",
    top: "0",
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow4,
  },
  headerCell: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    padding: spacing.md,
    fontSize: tokens.fontSizeBase300,
  },
  modernRow: {
    transition: "all 0.15s ease",
    ":nth-child(even)": {
      backgroundColor: tokens.colorNeutralBackground1,
    },
    ":nth-child(odd)": {
      backgroundColor: tokens.colorSubtleBackground,
    },
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      transform: "translateY(-1px)",
      boxShadow: tokens.shadow4,
    },
    ":focus-within": {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
      boxShadow: `inset 3px 0 0 ${tokens.colorBrandForeground1}`,
    },
  },
  languageCell: {
    width: "300px",
    padding: spacing.md,
    verticalAlign: "top",
  },
  compactLanguageCell: {
    width: "220px",
    padding: spacing.sm,
    verticalAlign: "top",
  },
  languageContent: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  languageName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
  },
  languageCode: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  inputCell: {
    padding: spacing.md,
    verticalAlign: "middle",
  },
  compactInputCell: {
    padding: spacing.sm,
    verticalAlign: "middle",
  },
  inputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  charCount: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: "right",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
    backgroundColor: tokens.colorSubtleBackground,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground3,
  },
  disabledContainer: {
    opacity: 0.6,
    pointerEvents: "none",
  },
  headerIcon: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
  },
});

export interface TranslationsTableV2Props {
  // Existing props
  lcids: number[];
  values: Record<number, string>;
  onChange: (lcid: number, value: string) => void;
  title?: string;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultLcid?: number;
  readOnly?: boolean;

  // New props
  compact?: boolean;
  stickyHeader?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  emptyMessage?: string;
  showLanguageCode?: boolean;
}

export default function TranslationsTableV2({
  lcids,
  values,
  onChange,
  title,
  loading = false,
  disabled = false,
  placeholder,
  defaultLcid = 1033,
  readOnly = false,
  compact = false,
  stickyHeader = false,
  showCharCount = false,
  maxLength,
  emptyMessage,
  showLanguageCode = true,
}: TranslationsTableV2Props): JSX.Element {
  const styles = useStyles();
  const [focusedLcid, setFocusedLcid] = useState<number | null>(null);

  // Sort with default language first, then by LCID
  const ordered = useMemo(() => {
    const sorted = (lcids ?? []).slice().sort((a, b) => {
      if (a === defaultLcid) return -1;
      if (b === defaultLcid) return 1;
      return a - b;
    });
    return sorted;
  }, [lcids, defaultLcid]);

  // Empty state
  if (lcids.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Globe20Regular style={{ fontSize: "32px" }} />
        <Text>{emptyMessage || "No languages configured"}</Text>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <TranslationsTableSkeleton rows={lcids.length || 5} />;
  }

  return (
    <div className={disabled ? styles.disabledContainer : (compact ? styles.compactContainer : styles.container)}>
      {title && (
        <Text weight="semibold" style={{ display: "block", marginBottom: spacing.sm }}>
          {title}
        </Text>
      )}

      <Table aria-label={title ?? "Translations"} className={styles.table}>
        <TableHeader className={stickyHeader ? styles.stickyHeader : undefined}>
          <TableRow>
            <TableHeaderCell className={styles.headerCell}>
              <div className={styles.headerIcon}>
                <Globe20Regular />
                Language
              </div>
            </TableHeaderCell>
            <TableHeaderCell className={styles.headerCell}>Label</TableHeaderCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {ordered.map((lcid, index) => (
            <TableRow key={lcid} className={styles.modernRow} data-row-index={index}>
              <TableCell className={compact ? styles.compactLanguageCell : styles.languageCell}>
                <div className={styles.languageContent}>
                  <div className={styles.languageName}>
                    {getLanguageDisplayNameWithoutLcid(lcid)}
                    {lcid === defaultLcid && (
                      <Badge appearance="tint" color="brand" size="small">
                        Default
                      </Badge>
                    )}
                  </div>
                  {showLanguageCode && (
                    <div className={styles.languageCode}>LCID: {lcid}</div>
                  )}
                </div>
              </TableCell>
              <TableCell className={compact ? styles.compactInputCell : styles.inputCell}>
                <div className={styles.inputWrapper}>
                  <Input
                    size={compact ? "medium" : "large"}
                    appearance="filled-darker"
                    value={values[lcid] ?? ""}
                    onChange={(e) => onChange(lcid, e.target.value)}
                    onFocus={() => setFocusedLcid(lcid)}
                    onBlur={() => setFocusedLcid(null)}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={readOnly}
                    maxLength={maxLength}
                  />
                  {showCharCount && focusedLcid === lcid && maxLength && (
                    <div className={styles.charCount}>
                      {(values[lcid] ?? "").length} / {maxLength}
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
