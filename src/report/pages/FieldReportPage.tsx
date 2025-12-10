// src/pages/FieldReportPage.tsx
import { useEffect } from "react";
import {
  Text,
  makeStyles,
  shorthands,
  tokens,
  Button,
} from "@fluentui/react-components";
import {
  DocumentText24Regular,
  Table24Regular,
  Code24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from "@fluentui/react-icons";

import { ErrorBox } from "../../components/ui/Notice";
import EntityLabelEditor from "../../components/EntityLabelEditor";
import FormLabelEditor from "../../components/FormLabelEditor";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";

// Hook that provides context from the URL (clientUrl, entity, attribute, formId, labelId, etc.)
import { useOrgContext } from "../../hooks/useOrgContext";
import { useSharedStyles, spacing } from "../../styles/theme";
import { useTheme } from "../../context/ThemeContext";

const useStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  content: {
    flex: 1,
    ...shorthands.padding(spacing.xl),
    maxWidth: "1400px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.lg),
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    rowGap: spacing.sm,
    columnGap: spacing.md,
    fontSize: tokens.fontSizeBase300,
  },
  metaLabel: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  metaValue: {
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(spacing.xs, spacing.sm),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
  },
});

export default function FieldReportPage(): JSX.Element {
  const styles = useStyles();
  const sharedStyles = useSharedStyles();
  const { theme, mode, toggleTheme } = useTheme();

  const { clientUrl, entity, attribute, formId, labelId } = useOrgContext();

  // Set document title
  useEffect(() => {
    document.title = 'Field Labels - D365 Translator';
  }, []);

  // Simple inline validation
  const problems: string[] = [];
  if (!clientUrl) problems.push("Missing clientUrl in query.");
  if (!entity) problems.push("Missing entity in query.");
  if (!attribute) problems.push("Missing attribute in query.");

  const canEditEntityLabels = !!clientUrl && !!entity && !!attribute;
  const canEditFormLabels = canEditEntityLabels;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Field Translations"
        subtitle="Manage multi-language labels for entity fields and form controls"
        icon={<DocumentText24Regular />}
        actions={
          <Button
            appearance="subtle"
            icon={mode === "dark" ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
            onClick={toggleTheme}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          />
        }
      />

      <div className={styles.content}>
        {/* Context Information */}
        <Section title="Context" icon={<Code24Regular />}>
          {problems.length > 0 ? (
            <ErrorBox>{problems.join(" ")}</ErrorBox>
          ) : (
            <div className={styles.metaGrid}>
              <span className={styles.metaLabel}>Client URL:</span>
              <code className={styles.metaValue}>{clientUrl || "(none)"}</code>

              <span className={styles.metaLabel}>Entity:</span>
              <code className={styles.metaValue}>{entity || "(none)"}</code>

              <span className={styles.metaLabel}>Attribute:</span>
              <code className={styles.metaValue}>{attribute || "(none)"}</code>

              {formId && (
                <>
                  <span className={styles.metaLabel}>Form ID:</span>
                  <code className={styles.metaValue}>{formId}</code>
                </>
              )}

              {labelId && (
                <>
                  <span className={styles.metaLabel}>Label ID:</span>
                  <code className={styles.metaValue}>{labelId}</code>
                </>
              )}
            </div>
          )}
        </Section>

        {/* Entity DisplayName editor */}
        {canEditEntityLabels && (
          <Section title="Entity Field Labels" icon={<Table24Regular />}>
            <EntityLabelEditor
              clientUrl={clientUrl!}
              entity={entity!}
              attribute={attribute!}
            />
          </Section>
        )}

        {/* Form control label editor */}
        {canEditFormLabels && (
          <Section title="Form Control Labels" icon={<Table24Regular />}>
            <FormLabelEditor
              clientUrl={clientUrl!}
              entity={entity!}
              attribute={attribute!}
              formId={(formId || "").replace(/[{}]/g, "").toLowerCase()}
              labelId={(labelId || "").replace(/[{}]/g, "").toLowerCase()}
            />
          </Section>
        )}
      </div>
    </div>
  );
}
