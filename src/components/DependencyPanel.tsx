/**
 * DependencyPanel - Generic reusable dependency list panel
 * Displays searchable list of dependencies with error handling
 */

import { useState, useMemo } from "react";
import {
  Input,
  Text,
  Badge,
  Spinner,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Database24Regular, Search20Regular } from "@fluentui/react-icons";

import Section from "./ui/Section";
import { ErrorBox } from "./ui/Notice";
import { spacing } from "../styles/theme";

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
    gap: spacing.xs,
    maxHeight: "400px",
    overflowY: "auto",
    padding: spacing.sm,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  dependencyItem: {
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid transparent`,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      border: `1px solid ${tokens.colorBrandStroke1}`,
    },
  },
  clickableDependency: {
    cursor: "pointer",
  },
  loadingContainer: {
    textAlign: "center",
    padding: spacing.lg,
  },
  emptyState: {
    textAlign: "center",
    padding: spacing.xl,
    color: tokens.colorNeutralForeground3,
  },
});

interface DependencyItem {
  [key: string]: unknown;
}

interface DependencyPanelProps<T extends DependencyItem> {
  /** List of dependencies */
  dependencies: T[];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Title for the section */
  title?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Render function for each item */
  renderItem: (item: T) => React.ReactNode;
  /** Function to extract unique key from item */
  getItemKey: (item: T) => string;
  /** Function to filter items by search term */
  filterItem?: (item: T, searchTerm: string) => boolean;
  /** Optional click handler */
  onItemClick?: (item: T) => void;
}

/**
 * Generic dependency panel with search and error handling
 * Displays a searchable list of dependencies with configurable rendering
 */
export default function DependencyPanel<T extends DependencyItem>({
  dependencies,
  loading,
  error,
  title = "Dependencies",
  searchPlaceholder = "Search...",
  emptyMessage = "No dependencies found.",
  renderItem,
  getItemKey,
  filterItem,
  onItemClick,
}: DependencyPanelProps<T>): JSX.Element {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter dependencies by search term
  const filteredDependencies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return dependencies;

    if (filterItem) {
      return dependencies.filter((item) => filterItem(item, term));
    }

    return dependencies;
  }, [dependencies, searchTerm, filterItem]);

  return (
    <div>
      <div className={styles.dependenciesSearchRow}>
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(_, data) => setSearchTerm(data.value)}
          contentBefore={<Search20Regular />}
          className={styles.dependenciesSearchInput}
        />
        <Badge appearance="outline" className={styles.dependenciesCountBadge}>
          {dependencies.length} total
        </Badge>
      </div>

      <Section title={title} icon={<Database24Regular />}>
        {error && <ErrorBox>{error}</ErrorBox>}

        {loading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="medium" label="Loading dependencies..." />
          </div>
        ) : filteredDependencies.length === 0 ? (
          <div className={styles.emptyState}>
            <Text>{emptyMessage}</Text>
          </div>
        ) : (
          <div className={styles.dependencyList}>
            {filteredDependencies.map((item) => {
              const isClickable = !!onItemClick;

              return (
                <div
                  key={getItemKey(item)}
                  className={`${styles.dependencyItem} ${
                    isClickable ? styles.clickableDependency : ""
                  }`}
                  onClick={() => onItemClick?.(item)}
                >
                  {renderItem(item)}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
