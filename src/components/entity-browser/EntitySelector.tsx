/**
 * EntitySelector - Displays filterable list of D365 entities
 */

import { useState, useMemo } from "react";
import {
  Input,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { Database24Regular, Search20Regular } from "@fluentui/react-icons";
import Section from "../ui/Section";
import { spacing } from "../../styles/theme";
import {
  getEntityDisplayName,
  type EntitySummary,
} from "../../services/entityMetadataService";

const useStyles = makeStyles({
  searchBox: {
    width: "100%",
  },
  entityList: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.xs),
    maxHeight: "70vh",
    overflowY: "auto",
    ...shorthands.padding(spacing.sm),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
  },
  entityItem: {
    ...shorthands.padding(spacing.sm, spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    cursor: "pointer",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", "transparent"),
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
    },
    "&.selected": {
      backgroundColor: tokens.colorBrandBackground2,
      ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
    },
  },
  entityName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    marginBottom: spacing.xs,
    whiteSpace: "nowrap",
    ...shorthands.overflow("hidden"),
    textOverflow: "ellipsis",
  },
  entityMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    ...shorthands.overflow("hidden"),
    textOverflow: "ellipsis",
  },
  emptyState: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
    color: tokens.colorNeutralForeground3,
  },
});

interface EntitySelectorProps {
  /** List of entities to display */
  entities: EntitySummary[];
  /** Currently selected entity logical name */
  selectedEntity: string | null;
  /** Callback when entity is selected */
  onSelectEntity: (logicalName: string) => void;
  /** Loading state */
  loading: boolean;
}

/**
 * Entity selector component with search functionality
 * Displays a filterable list of D365 entities
 */
export default function EntitySelector({
  entities,
  selectedEntity,
  onSelectEntity,
  loading,
}: EntitySelectorProps): JSX.Element {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter entities by search term (searches both display name and logical name)
  const filteredEntities = useMemo(() => {
    if (!searchTerm.trim()) return entities;

    const term = searchTerm.toLowerCase();
    return entities.filter((entity) => {
      const displayName = getEntityDisplayName(entity).toLowerCase();
      const logicalName = entity.LogicalName.toLowerCase();
      return displayName.includes(term) || logicalName.includes(term);
    });
  }, [entities, searchTerm]);

  return (
    <Section title="Entities" icon={<Database24Regular />}>
      <Input
        placeholder="Search entities..."
        value={searchTerm}
        onChange={(_, data) => setSearchTerm(data.value)}
        contentBefore={<Search20Regular />}
        className={styles.searchBox}
      />

      {loading ? (
        <div className={styles.emptyState}>
          <Spinner size="medium" label="Loading entities..." />
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className={styles.emptyState}>
          <Text>No entities found</Text>
        </div>
      ) : (
        <div className={styles.entityList}>
          {filteredEntities.map((entity) => (
            <div
              key={entity.LogicalName}
              className={`${styles.entityItem} ${
                selectedEntity === entity.LogicalName ? "selected" : ""
              }`}
              onClick={() => onSelectEntity(entity.LogicalName)}
            >
              <div className={styles.entityName}>
                {getEntityDisplayName(entity)}
              </div>
              <div className={styles.entityMeta}>{entity.LogicalName}</div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
