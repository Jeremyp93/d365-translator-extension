import * as React from "react";
import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  shorthands,
  tokens,
  Badge,
} from "@fluentui/react-components";
import { Globe20Regular } from "@fluentui/react-icons";
import TextInput from "./ui/TextInput";
import { getLanguageDisplayName } from "../utils/languageNames";
import { spacing } from "../styles/theme";

const useStyles = makeStyles({
  container: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow("hidden"),
    width: "100%",
    overflowX: "auto",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
    ...shorthands.padding(spacing.lg),
  },
  table: {
    width: "100%",
    minWidth: "600px",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerRow: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  headerCell: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    ...shorthands.padding(spacing.md),
  },
  languageCell: {
    width: "280px",
    minWidth: "200px",
    maxWidth: "320px",
    ...shorthands.padding(spacing.md),
    verticalAlign: "middle",
  },
  labelCell: {
    ...shorthands.padding(spacing.md),
    verticalAlign: "middle",
  },
  languageDisplay: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  languageName: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  defaultBadge: {
    marginLeft: spacing.xs,
  },
  row: {
    transition: "background-color 0.15s ease",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  disabledContainer: {
    opacity: 0.6,
    pointerEvents: "none",
  },
});

export interface TranslationsTableProps {
  lcids: number[];
  values: Record<number, string>;
  onChange: (lcid: number, value: string) => void;
  title?: string;

  // NEW:
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultLcid?: number; // Default language to show first (e.g., 1033)
  readOnly?: boolean; // Make inputs readonly
}

export default function TranslationsTable({
  lcids,
  values,
  onChange,
  title,
  loading,
  disabled,
  placeholder,
  defaultLcid = 1033,
  readOnly = false,
}: TranslationsTableProps): JSX.Element {
  const styles = useStyles();

  // Sort with default language first, then by LCID
  const ordered = React.useMemo(() => {
    const sorted = (lcids ?? []).slice().sort((a, b) => {
      if (a === defaultLcid) return -1;
      if (b === defaultLcid) return 1;
      return a - b;
    });
    return sorted;
  }, [lcids, defaultLcid]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="small" />
        <Text>Loading translations…</Text>
      </div>
    );
  }

  return (
    <div className={disabled ? styles.disabledContainer : styles.container}>
      {title && (
        <Text weight="semibold" style={{ display: "block", marginBottom: spacing.sm }}>
          {title}
        </Text>
      )}

      <Table aria-label={title ?? "Translations"} className={styles.table}>
        <TableHeader>
          <TableRow className={styles.headerRow}>
            <TableHeaderCell className={styles.headerCell}>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                <Globe20Regular />
                Language
              </div>
            </TableHeaderCell>
            <TableHeaderCell className={styles.headerCell}>Label</TableHeaderCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {ordered.map((lcid) => (
            <TableRow key={lcid} className={styles.row}>
              <TableCell className={styles.languageCell}>
                <div className={styles.languageDisplay}>
                  <code className={styles.languageName}>{getLanguageDisplayName(lcid)}</code>
                  {lcid === defaultLcid && (
                    <Badge 
                      appearance="tint" 
                      color="brand" 
                      size="small"
                      className={styles.defaultBadge}
                    >
                      Default
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className={styles.labelCell}>
                <TextInput
                  value={values[lcid] ?? ""}
                  onChange={(e) =>
                    onChange(lcid, (e.target as HTMLInputElement).value)
                  }
                  placeholder={placeholder}
                  disabled={disabled}
                  readOnly={readOnly}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

