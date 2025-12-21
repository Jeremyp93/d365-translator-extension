/**
 * AttributeDependenciesPanel - Displays forms and views that use an attribute
 */

import { useState, useMemo } from "react";
import {
  Input,
  Text,
  Badge,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { Database24Regular, Search20Regular } from "@fluentui/react-icons";
import Section from "../ui/Section";
import FlexBadge from "../ui/FlexBadge";
import { ErrorBox } from "../ui/Notice";
import { spacing } from "../../styles/theme";
import type { AttributeDependencyRow } from "../../services/dependencyService";

const useStyles = makeStyles({
  dependenciesSearchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  dependenciesSearchInput: {
    flex: 1,
    minWidth: 0,
  },
  dependenciesCountBadge: {
    marginLeft: spacing.md,
  },
  dependencyList: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.xs),
    maxHeight: "400px",
    overflowY: "auto",
    ...shorthands.padding(spacing.sm),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
  },
  dependencyItem: {
    ...shorthands.padding(spacing.sm, spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", "transparent"),
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
    },
  },
  clickableDependency: {
    cursor: "pointer",
  },
  dependencyName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  entityMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    ...shorthands.overflow("hidden"),
    textOverflow: "ellipsis",
  },
  solutionInfo: {
    marginTop: spacing.xs,
  },
  solutionText: {
    color: tokens.colorNeutralForeground3,
  },
  loadingContainer: {
    textAlign: "center",
    ...shorthands.padding(spacing.lg),
  },
  emptyState: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
    color: tokens.colorNeutralForeground3,
  },
});

interface AttributeDependenciesPanelProps {
  /** List of dependencies (forms/views) */
  dependencies: AttributeDependencyRow[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Selected entity logical name (for opening forms) */
  selectedEntity: string;
  /** D365 organization URL */
  clientUrl: string;
  /** Web API version */
  apiVersion?: string;
}

/**
 * Displays forms and views that use the selected attribute
 * Forms are clickable and open in a new tab
 */
export default function AttributeDependenciesPanel({
  dependencies,
  loading,
  error,
  selectedEntity,
  clientUrl,
  apiVersion,
}: AttributeDependenciesPanelProps): JSX.Element {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter dependencies by search term
  const filteredDependencies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return dependencies;

    return dependencies.filter(
      (d) =>
        d.componentDisplayName.toLowerCase().includes(term) ||
        d.componentName.toLowerCase().includes(term) ||
        d.componentTypeName.toLowerCase().includes(term) ||
        d.solutionUniqueName.toLowerCase().includes(term)
    );
  }, [dependencies, searchTerm]);

  const handleDependencyClick = (dependency: AttributeDependencyRow) => {
    // Forms: componentType 24 or 60
    const isForm = dependency.componentType === 24 || dependency.componentType === 60;

    if (!isForm || !clientUrl || !selectedEntity) return;

    // Build URL to FormReportPage with entity and formId
    const params = new URLSearchParams({
      clientUrl,
      entity: selectedEntity,
      formId: dependency.componentObjectId,
      ...(apiVersion ? { apiVersion } : {}),
    });

    const url = `${window.location.origin}${window.location.pathname}#/report/form?${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <div>
      <div className={styles.dependenciesSearchRow}>
        <Input
          placeholder="Search forms/views..."
          value={searchTerm}
          onChange={(_, data) => setSearchTerm(data.value)}
          contentBefore={<Search20Regular />}
          className={styles.dependenciesSearchInput}
        />
        <Badge appearance="outline" className={styles.dependenciesCountBadge}>
          {dependencies.length} total
        </Badge>
      </div>

      <Section title="Used by Forms & Views" icon={<Database24Regular />}>
        {error && <ErrorBox>{error}</ErrorBox>}

        {loading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="medium" label="Loading dependencies..." />
          </div>
        ) : filteredDependencies.length === 0 ? (
          <div className={styles.emptyState}>
            <Text>No forms or views found using this attribute.</Text>
          </div>
        ) : (
          <div className={styles.dependencyList}>
            {filteredDependencies.map((d, idx) => {
              const isForm = d.componentType === 24 || d.componentType === 60;

              return (
                <div
                  key={`${d.componentObjectId}-${idx}`}
                  className={`${styles.dependencyItem} ${
                    isForm ? styles.clickableDependency : ""
                  }`}
                  onClick={() => handleDependencyClick(d)}
                  title={isForm ? "Click to open form in new tab" : undefined}
                >
                  <FlexBadge
                    label={d.componentDisplayName}
                    badge={d.componentTypeName}
                    badgeColor="informative"
                    badgeAppearance="filled"
                    labelClassName={styles.dependencyName}
                  />
                  <div className={styles.entityMeta}>
                    <Text size={200}>
                      {d.componentParentName ||
                        d.componentName ||
                        d.componentObjectId}
                    </Text>
                  </div>
                  {d.solutionUniqueName && (
                    <div className={styles.solutionInfo}>
                      <Text size={100} className={styles.solutionText}>
                        Solution: {d.solutionUniqueName}
                      </Text>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
