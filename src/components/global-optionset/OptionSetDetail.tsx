/**
 * OptionSetDetail - Display and edit global option set translations
 */

import {
  makeStyles,
  shorthands,
  Text,
  Spinner,
  Badge,
  Card,
  CardHeader,
  Divider,
  tokens,
} from "@fluentui/react-components";
import { Database24Regular, Code24Regular } from "@fluentui/react-icons";
import Section from "../ui/Section";
import CustomButton from "../ui/Button";
import TranslationsTable from "../TranslationsTable";
import type { OptionSetMetadata } from "../../types";
import { spacing } from "../../styles/theme";

const useStyles = makeStyles({
  emptyState: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
    color: tokens.colorNeutralForeground3,
  },
  spinnerContainerLarge: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
  },
  cardPadding: {
    ...shorthands.padding(spacing.md),
  },
  dividerMargin: {
    ...shorthands.margin(spacing.md, 0),
  },
  scrollableContent: {
    maxHeight: "60vh",
    overflowY: "auto",
  },
  optionRow: {
    marginBottom: "32px",
  },
  optionHeader: {
    display: "flex",
    alignItems: "baseline",
    ...shorthands.gap(spacing.md),
    marginBottom: spacing.md,
  },
  optionValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  optionValueNumber: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  actions: {
    display: "flex",
    ...shorthands.gap(spacing.sm),
    marginTop: spacing.md,
  },
  flexGapSmall: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
});

export interface OptionSetDetailProps {
  selectedOptionSet: string | null;
  loadingDetail: boolean;
  selectedMetadata: OptionSetMetadata | null;
  lcids: number[];
  langs: number[] | null;
  values: Record<number, Record<number, string>>;
  onChange: (optionValue: number, lcid: number, value: string) => void;
  onSave: () => void;
  saving: boolean;
  /** Set to true to make all inputs read-only (e.g., editing blocked, save in progress) */
  readOnly?: boolean;
}

export default function OptionSetDetail({
  selectedOptionSet,
  loadingDetail,
  selectedMetadata,
  lcids,
  langs,
  values,
  onChange,
  onSave,
  saving,
  readOnly = false,
}: OptionSetDetailProps): JSX.Element {
  const styles = useStyles();

  if (!selectedOptionSet) {
    return (
      <Section title="Select an OptionSet" icon={<Code24Regular />}>
        <div className={styles.emptyState}>
          <Text>Select a global option set from the list to view and edit its translations.</Text>
        </div>
      </Section>
    );
  }

  if (loadingDetail) {
    return (
      <Section title="Loading..." icon={<Code24Regular />}>
        <div className={styles.spinnerContainerLarge}>
          <Spinner size="large" label="Loading option set details..." />
        </div>
      </Section>
    );
  }

  if (!selectedMetadata) {
    return (
      <Section title="Select an OptionSet" icon={<Code24Regular />}>
        <div className={styles.emptyState}>
          <Text>No data available.</Text>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title={`Translating: ${selectedMetadata.displayName}`}
      icon={<Database24Regular />}
    >
      <Card className={styles.cardPadding}>
        <CardHeader
          header={
            <div className={styles.flexGapSmall}>
              <Text weight="semibold">{selectedMetadata.displayName}</Text>
              <Badge color="informative" appearance="filled">
                Global OptionSet
              </Badge>
              <Badge appearance="outline">
                {selectedMetadata.options.length} {selectedMetadata.options.length === 1 ? "option" : "options"}
              </Badge>
            </div>
          }
          description={
            <Text size={200}>
              Logical Name: <code>{selectedMetadata.name}</code>
            </Text>
          }
        />

        <Divider className={styles.dividerMargin} />

        {selectedMetadata.options.length === 0 ? (
          <Text>No options defined for this option set.</Text>
        ) : (
          <div className={styles.scrollableContent}>
            {selectedMetadata.options.map((option) => (
              <div key={option.value} className={styles.optionRow}>
                <div className={styles.optionHeader}>
                  <Text className={styles.optionValueNumber}>{option.value}</Text>
                  <Text className={styles.optionValue}>
                    {option.labels.find((l) => l.languageCode === langs?.[0])?.label ||
                      option.labels[0]?.label || "N/A"}
                  </Text>
                </div>

                <TranslationsTable
                  lcids={lcids}
                  values={values[option.value] || {}}
                  loading={false}
                  disabled={!langs || !langs.length || readOnly}
                  placeholder="(empty)"
                  onChange={(lcid, v) => onChange(option.value, lcid, v)}
                />
              </div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <CustomButton
            onClick={onSave}
            disabled={saving || !langs?.length || readOnly}
            variant="primary"
          >
            {saving ? "Saving…" : "Save Changes"}
          </CustomButton>
        </div>
      </Card>
    </Section>
  );
}
