/**
 * ListSelector - Generic reusable list selector with search
 * Supports any item type with configurable display logic
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
import Section from "./ui/Section";
import { spacing } from "../styles/theme";

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

interface ListSelectorProps<T> {
  /** List of items to display */
  items: T[];
  /** Title for the section */
  title?: string;
  /** Placeholder text for search */
  searchPlaceholder?: string;
  /** Currently selected item identifier */
  selectedItem: string | null;
  /** Callback when item is selected */
  onSelectItem: (identifier: string) => void;
  /** Loading state */
  loading: boolean;
  /** Function to extract unique identifier from item */
  getItemKey: (item: T) => string;
  /** Function to extract display name from item */
  getDisplayName: (item: T) => string;
  /** Function to extract meta text from item */
  getMetaText: (item: T) => string;
  /** Function to check if search matches */
  filterItem?: (item: T, searchTerm: string) => boolean;
}

/**
 * Generic list selector component with search functionality
 * Displays a filterable list of items with configurable display logic
 */
export default function ListSelector<T>({
  items,
  title = "Items",
  searchPlaceholder = "Search...",
  selectedItem,
  onSelectItem,
  loading,
  getItemKey,
  getDisplayName,
  getMetaText,
  filterItem,
}: ListSelectorProps<T>): JSX.Element {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter items by search term (uses custom filter or default)
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;

    const term = searchTerm.toLowerCase();

    if (filterItem) {
      return items.filter((item) => filterItem(item, term));
    }

    // Default filter: search display name and meta text
    return items.filter((item) => {
      const displayName = getDisplayName(item).toLowerCase();
      const metaText = getMetaText(item).toLowerCase();
      return displayName.includes(term) || metaText.includes(term);
    });
  }, [items, searchTerm, filterItem, getDisplayName, getMetaText]);

  return (
    <Section title={title} icon={<Database24Regular />}>
      <Input
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(_, data) => setSearchTerm(data.value)}
        contentBefore={<Search20Regular />}
        className={styles.searchBox}
      />

      {loading ? (
        <div className={styles.emptyState}>
          <Spinner size="medium" label={`Loading ${title.toLowerCase()}...`} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Text>No {title.toLowerCase()} found</Text>
        </div>
      ) : (
        <div className={styles.entityList}>
          {filteredItems.map((item) => {
            const itemKey = getItemKey(item);
            return (
              <div
                key={itemKey}
                className={`${styles.entityItem} ${
                  selectedItem === itemKey ? "selected" : ""
                }`}
                onClick={() => onSelectItem(itemKey)}
              >
                <div className={styles.entityName}>
                  {getDisplayName(item)}
                </div>
                <div className={styles.entityMeta}>{getMetaText(item)}</div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
