/**
 * AttributeDataGrid - Displays filterable table of entity attributes
 */

import { useState, useMemo } from "react";
import {
  Input,
  Text,
  Badge,
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  createTableColumn,
  TableCellLayout,
  makeStyles,
  tokens,
  type TableColumnDefinition,
} from "@fluentui/react-components";
import { Database24Regular, Search20Regular } from "@fluentui/react-icons";

import Section from "../ui/Section";
import { spacing } from "../../styles/theme";
import {
  getAttributeDisplayName,
  type AttributeSummary,
} from "../../services/entityMetadataService";
import { getAttributeTypeColor } from "../../utils/attributeTypes";

const useStyles = makeStyles({
  searchBox: {
    width: "100%",
  },
  attributeGrid: {
    maxHeight: "400px",
    overflowY: "auto",
    overflowX: "auto",
    width: "100%",
  },
  typeBadge: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  typeBadgeLocked: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    opacity: 0.6,
  },
  lockedText: {
    color: tokens.colorNeutralForeground3,
    opacity: 0.6,
  },
  monospaceText: {
    fontFamily: tokens.fontFamilyMonospace,
  },
  lockedMonospaceText: {
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorNeutralForeground3,
    opacity: 0.6,
  },
  emptyState: {
    textAlign: "center",
    padding: spacing.xl,
    color: tokens.colorNeutralForeground3,
  },
});

export interface AttributeItem {
  logicalName: string;
  displayName: string;
  attributeType: string;
  metadataId: string;
  isCustomizable: boolean;
  isLocked: boolean;
}

interface AttributeDataGridProps {
  /** List of attributes to display */
  attributes: AttributeSummary[];
  /** Callback when unlocked attribute is selected */
  onSelectAttribute: (attribute: AttributeItem) => void;
  /** Callback when locked attribute is clicked */
  onLockedAttributeClick: (reason: string) => void;
}

/**
 * Attribute data grid with search and selection
 * Locked attributes (non-customizable or missing display name) cannot be selected
 */
export default function AttributeDataGrid({
  attributes,
  onSelectAttribute,
  onLockedAttributeClick,
}: AttributeDataGridProps): JSX.Element {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState("");

  // Convert AttributeSummary to AttributeItem with derived properties
  const attributeItems: AttributeItem[] = useMemo(() => {
    return attributes.map((attr) => {
      const displayName = getAttributeDisplayName(attr);
      const isCustomizable = attr.IsCustomizable?.Value ?? false;
      const hasEmptyDisplayName = !attr.DisplayName?.UserLocalizedLabel?.Label;

      return {
        logicalName: attr.LogicalName,
        displayName,
        attributeType: attr.AttributeType,
        metadataId: attr.MetadataId,
        isCustomizable,
        isLocked: !isCustomizable || hasEmptyDisplayName,
      };
    });
  }, [attributes]);

  // Filter attributes by search term
  const filteredAttributeItems = useMemo(() => {
    if (!searchTerm.trim()) return attributeItems;

    const term = searchTerm.toLowerCase();
    return attributeItems.filter(
      (item) =>
        item.displayName.toLowerCase().includes(term) ||
        item.logicalName.toLowerCase().includes(term) ||
        item.attributeType.toLowerCase().includes(term)
    );
  }, [attributeItems, searchTerm]);

  // Define columns for DataGrid
  const columns: TableColumnDefinition<AttributeItem>[] = [
    createTableColumn<AttributeItem>({
      columnId: "displayName",
      compare: (a, b) => a.displayName.localeCompare(b.displayName),
      renderHeaderCell: () => "Display Name",
      renderCell: (item) => (
        <TableCellLayout>
          <Text
            weight="semibold"
            className={item.isLocked ? styles.lockedText : undefined}
          >
            {item.displayName}
            {item.isLocked && " 🔒"}
          </Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<AttributeItem>({
      columnId: "logicalName",
      compare: (a, b) => a.logicalName.localeCompare(b.logicalName),
      renderHeaderCell: () => "Logical Name",
      renderCell: (item) => (
        <TableCellLayout>
          <Text
            className={
              item.isLocked
                ? styles.lockedMonospaceText
                : styles.monospaceText
            }
          >
            {item.logicalName}
          </Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<AttributeItem>({
      columnId: "attributeType",
      compare: (a, b) => a.attributeType.localeCompare(b.attributeType),
      renderHeaderCell: () => "Type",
      renderCell: (item) => (
        <TableCellLayout>
          <Badge
            appearance={item.isLocked ? "outline" : "filled"}
            color={getAttributeTypeColor(item.attributeType)}
            className={
              item.isLocked ? styles.typeBadgeLocked : styles.typeBadge
            }
          >
            {item.attributeType}
          </Badge>
        </TableCellLayout>
      ),
    }),
  ];

  const handleSelectionChange = (selectedItems: Set<string>) => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length > 0) {
      const logicalName = selectedIds[0];
      const selectedItem = attributeItems.find(
        (item) => item.logicalName === logicalName
      );

      if (selectedItem) {
        if (!selectedItem.isLocked) {
          onSelectAttribute(selectedItem);
        } else {
          // Show info message for locked attributes
          const reason = !selectedItem.isCustomizable
            ? "This attribute is not customizable and cannot be translated"
            : "This attribute has no base display name and cannot be translated";
          onLockedAttributeClick(reason);
        }
      }
    }
  };

  if (attributes.length === 0) {
    return (
      <Section
        title="Attributes"
        icon={<Database24Regular />}
      >
        <div className={styles.emptyState}>
          <Text>No attributes found</Text>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title={`Attributes (${attributes.length})`}
      icon={<Database24Regular />}
    >
      <Input
        placeholder="Search attributes..."
        value={searchTerm}
        onChange={(_, data) => setSearchTerm(data.value)}
        contentBefore={<Search20Regular />}
        className={styles.searchBox}
      />

      {filteredAttributeItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Text>No attributes match your search</Text>
        </div>
      ) : (
        <div className={styles.attributeGrid}>
          <DataGrid
            items={filteredAttributeItems}
            columns={columns}
            sortable
            selectionMode="single"
            getRowId={(item) => item.logicalName}
            onSelectionChange={(_, data) => {
              handleSelectionChange(data.selectedItems as Set<string>);
            }}
          >
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => (
                  <DataGridHeaderCell>
                    {renderHeaderCell()}
                  </DataGridHeaderCell>
                )}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<AttributeItem>>
              {({ item, rowId }) => (
                <DataGridRow<AttributeItem> key={rowId}>
                  {({ renderCell }) => (
                    <DataGridCell>{renderCell(item)}</DataGridCell>
                  )}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </div>
      )}
    </Section>
  );
}
