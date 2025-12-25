/**
 * FieldReportPage - Manage translations for entity fields and form controls
 * Refactored to follow React best practices
 */

import { useEffect } from "react";
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
} from "@fluentui/react-components";
import {
  Table24Regular,
  Code24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  ColumnEdit24Regular,
} from "@fluentui/react-icons";

import { ErrorBox } from "../../components/ui/Notice";
import EntityLabelEditor from "../../components/EntityLabelEditor";
import FormLabelEditor from "../../components/FormLabelEditor";
import OptionSetEditor from "../../components/OptionSetEditor";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import { EditingBlockedBanner } from "../../components/ui/EditingBlockedBanner";

import { useOrgContext } from "../../hooks/useOrgContext";
import { useAttributeType } from "../../hooks/useAttributeType";
import { useEditingPermission } from "../../hooks/useEditingPermission";
import { spacing } from "../../styles/theme";
import { useTheme } from "../../context/ThemeContext";
import { isOptionSetType } from "../../services/optionSetService";
import { normalizeGuid } from "../../utils/stringHelpers";

const useStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    width: "100%",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  content: {
    flex: 1,
    ...shorthands.padding(spacing.xl),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.lg),
    "@media (max-width: 768px)": {
      ...shorthands.padding(spacing.md),
    },
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

interface FieldReportValidation {
  problems: string[];
  canEdit: boolean;
}

/**
 * Validates required parameters for field report functionality
 */
function validateFieldReportParams(
  clientUrl: string | undefined,
  entity: string | undefined,
  attribute: string | undefined
): FieldReportValidation {
  const problems: string[] = [];

  if (!clientUrl) problems.push("Missing clientUrl in query.");
  if (!entity) problems.push("Missing entity in query.");
  if (!attribute) problems.push("Missing attribute in query.");

  return {
    problems,
    canEdit: problems.length === 0,
  };
}

export default function FieldReportPage(): JSX.Element {
  const styles = useStyles();
  const { mode, toggleTheme } = useTheme();
  const { clientUrl, entity, attribute, formId, labelId, apiVersion } = useOrgContext();

  // Check editing permission based on environment variable
  const { isEditingBlocked, loading: permissionLoading } = useEditingPermission(clientUrl, apiVersion);

  // Validate required parameters
  const validation = validateFieldReportParams(clientUrl, entity, attribute);

  // Detect attribute type for conditional OptionSet editor
  const { attributeType } = useAttributeType(clientUrl, entity, attribute, apiVersion);

  // Set document title
  useEffect(() => {
    document.title = 'Field Labels - D365 Translator';
  }, []);

  // Early return if validation fails
  if (!validation.canEdit || !clientUrl || !entity || !attribute) {
    return (
      <main className={styles.page}>
        <PageHeader
          title="Field Translations"
          subtitle="Manage multi-language labels for entity fields and form controls"
          icon={<ColumnEdit24Regular />}
          connectionInfo={{ clientUrl, apiVersion }}
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
          <Section title="Context" icon={<Code24Regular />}>
            <ErrorBox>{validation.problems.join(" ")}</ErrorBox>
          </Section>
        </div>
      </main>
    );
  }

  // At this point, TypeScript knows clientUrl, entity, and attribute are defined (non-undefined)
  // TypeScript flow analysis confirms these are strings after the guard above
  return (
    <main className={styles.page}>
      <PageHeader
        title="Field Translations"
        subtitle="Manage multi-language labels for entity fields and form controls"
        icon={<ColumnEdit24Regular />}
        connectionInfo={{ clientUrl, apiVersion }}
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
        {/* Editing blocked warning banner */}
        <EditingBlockedBanner visible={isEditingBlocked} />

        {/* Context Information */}
        <Section title="Context" icon={<Code24Regular />}>
          <div className={styles.metaGrid}>
            <span className={styles.metaLabel}>Client URL:</span>
            <code className={styles.metaValue}>{clientUrl}</code>

            <span className={styles.metaLabel}>Entity:</span>
            <code className={styles.metaValue}>{entity}</code>

            <span className={styles.metaLabel}>Attribute:</span>
            <code className={styles.metaValue}>{attribute}</code>

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
        </Section>

        {/* Entity DisplayName editor */}
        <Section title="Entity Field Labels" icon={<Table24Regular />}>
          <EntityLabelEditor
            clientUrl={clientUrl}
            entity={entity}
            attribute={attribute}
            readOnly={isEditingBlocked || permissionLoading}
          />
        </Section>

        {/* Form control label editor */}
        <Section title="Form Control Labels" icon={<Table24Regular />}>
          <FormLabelEditor
            clientUrl={clientUrl}
            entity={entity}
            attribute={attribute}
            formId={normalizeGuid(formId)}
            labelId={normalizeGuid(labelId)}
            readOnly={isEditingBlocked || permissionLoading}
          />
        </Section>

        {/* OptionSet editor - only show if field is an OptionSet */}
        {attributeType && isOptionSetType(attributeType) && (
          <Section title="OptionSet Translations" icon={<Table24Regular />}>
            <OptionSetEditor
              clientUrl={clientUrl}
              entity={entity}
              attribute={attribute}
              apiVersion={apiVersion}
              readOnly={isEditingBlocked || permissionLoading}
            />
          </Section>
        )}
      </div>
    </main>
  );
}
