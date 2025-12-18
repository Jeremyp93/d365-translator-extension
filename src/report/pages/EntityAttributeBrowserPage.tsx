import { useEffect, useState, useMemo } from "react";
import {
  Text,
  makeStyles,
  shorthands,
  tokens,
  Input,
  Spinner,
  Badge,
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  createTableColumn,
  TableColumnDefinition,
  TableCellLayout,
  Button,
} from "@fluentui/react-components";
import {
  Database24Regular,
  Search20Regular,
  TableEdit24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from "@fluentui/react-icons";

import { ErrorBox, Info } from "../../components/ui/Notice";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import EntityLabelEditor from "../../components/EntityLabelEditor";

import { useOrgContext } from "../../hooks/useOrgContext";
import { useLanguages } from "../../hooks/useLanguages";
import { useSharedStyles, spacing } from "../../styles/theme";
import { useTheme } from "../../context/ThemeContext";
import {
  listAllEntities,
  listEntityAttributes,
  getEntityDisplayName,
  getAttributeDisplayName,
} from "../../services/entityMetadataService";
import type { EntitySummary, AttributeSummary } from "../../services/entityMetadataService";

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
  splitLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(250px, 400px) minmax(0, 1fr)",
    ...shorthands.gap(spacing.lg),
    "@media (max-width: 1024px)": {
      gridTemplateColumns: "minmax(200px, 300px) minmax(0, 1fr)",
    },
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
    },
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
  },
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
  detailPanel: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
    minWidth: 0,
    overflow: "hidden",
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
  emptyState: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
    color: tokens.colorNeutralForeground3,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    ...shorthands.padding("16px", "24px"),
    ...shorthands.borderBottom("2px", "solid", tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("4px"),
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  connectionInfo: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("6px"),
  },
  themeButton: {
    minWidth: "auto",
  },
  attributeRow: {
    marginBottom: "32px",
  },
});

// Badge color mapping for attribute types
function getAttributeTypeColor(attributeType: string): "brand" | "success" | "warning" | "danger" | "important" | "informative" | "severe" | "subtle" {
  const type = attributeType.toLowerCase();
  if (type.includes("string") || type === "memo") return "informative";
  if (type.includes("integer") || type.includes("decimal") || type.includes("double") || type.includes("money")) return "success";
  if (type.includes("picklist") || type.includes("boolean") || type.includes("status") || type.includes("state")) return "brand";
  if (type.includes("lookup") || type.includes("customer") || type.includes("owner")) return "important";
  if (type.includes("datetime")) return "warning";
  if (type.includes("uniqueidentifier")) return "severe";
  return "subtle";
}

interface AttributeItem {
  logicalName: string;
  displayName: string;
  attributeType: string;
  metadataId: string;
  isCustomizable: boolean;
  isLocked: boolean;
}

export default function EntityAttributeBrowserPage(): JSX.Element {
  const styles = useStyles();
  const sharedStyles = useSharedStyles();
  const { theme, mode, toggleTheme } = useTheme();
  const { clientUrl, apiVersion } = useOrgContext();
  
  const { langs, error: langsError } = useLanguages(clientUrl || "", apiVersion);

  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<AttributeSummary[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTermAttributes, setSearchTermAttributes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Set document title
  useEffect(() => {
    document.title = 'Entity Browser - D365 Translator';
  }, []);

  // Load entities list
  useEffect(() => {
    if (!clientUrl) return;
    
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const entityList = await listAllEntities(clientUrl, apiVersion);
        if (!cancelled) {
          setEntities(entityList);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [clientUrl, apiVersion]);

  // Load attributes when entity is selected
  useEffect(() => {
    if (!clientUrl || !selectedEntity) {
      setAttributes([]);
      setSelectedAttribute(null);
      return;
    }
    
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setInfo("Loading attributes…");
        setLoadingAttributes(true);
        
        const attributeList = await listEntityAttributes(clientUrl, selectedEntity, apiVersion);
        
        if (!cancelled) {
          setAttributes(attributeList);
          setInfo(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoadingAttributes(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [clientUrl, selectedEntity, apiVersion]);

  // Filter entities by search term
  const filteredEntities = useMemo(() => {
    if (!searchTerm.trim()) return entities;
    
    const term = searchTerm.toLowerCase();
    return entities.filter(entity => {
      const displayName = getEntityDisplayName(entity).toLowerCase();
      const logicalName = entity.LogicalName.toLowerCase();
      return displayName.includes(term) || logicalName.includes(term);
    });
  }, [entities, searchTerm]);

  // Prepare attribute items for DataGrid
  const attributeItems: AttributeItem[] = useMemo(() => {
    return attributes.map(attr => {
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
    if (!searchTermAttributes.trim()) return attributeItems;
    
    const term = searchTermAttributes.toLowerCase();
    return attributeItems.filter(item => {
      return item.displayName.toLowerCase().includes(term) ||
             item.logicalName.toLowerCase().includes(term) ||
             item.attributeType.toLowerCase().includes(term);
    });
  }, [attributeItems, searchTermAttributes]);

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
            style={{ 
              color: item.isLocked ? tokens.colorNeutralForeground3 : undefined,
              opacity: item.isLocked ? 0.6 : 1
            }}
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
            style={{ 
              fontFamily: tokens.fontFamilyMonospace,
              color: item.isLocked ? tokens.colorNeutralForeground3 : undefined,
              opacity: item.isLocked ? 0.6 : 1
            }}
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
            className={styles.typeBadge}
            style={{ opacity: item.isLocked ? 0.6 : 1 }}
          >
            {item.attributeType}
          </Badge>
        </TableCellLayout>
      ),
    }),
  ];

  const handleEntitySelect = (logicalName: string) => {
    setSelectedEntity(logicalName);
    setSelectedAttribute(null);
    setSearchTermAttributes("");
  };

  const handleAttributeSelect = (item: AttributeItem) => {
    console.log('[EntityBrowser] Attribute selected:', item.logicalName);
    setSelectedAttribute(item.logicalName);
    // Scroll editor into view after a short delay
    setTimeout(() => {
      const editorEl = document.querySelector('[data-entity-editor]');
      if (editorEl) {
        editorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleLabelsSaved = () => {
    setInfo("Attribute labels saved successfully!");
    setTimeout(() => setInfo(null), 3000);
  };

  return (
    <div className={styles.page}>
      <PageHeader
              title="Entity & Attribute Browser"
              subtitle="Browse and translate entity attributes across all entities"
              icon={<TableEdit24Regular />}
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
        {error && <ErrorBox>{error}</ErrorBox>}
        {info && <Info>{info}</Info>}
        {langsError && <ErrorBox>Failed to load languages: {langsError}</ErrorBox>}

        <div className={styles.splitLayout}>
          {/* Left Sidebar - Entity List */}
          <div className={styles.sidebar}>
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
                      className={`${styles.entityItem} ${selectedEntity === entity.LogicalName ? "selected" : ""}`}
                      onClick={() => handleEntitySelect(entity.LogicalName)}
                    >
                      <div className={styles.entityName}>
                        {getEntityDisplayName(entity)}
                      </div>
                      <div className={styles.entityMeta}>
                        {entity.LogicalName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Right Panel - Attributes */}
          <div className={styles.detailPanel}>
            {!selectedEntity ? (
              <div className={styles.emptyState}>
                <Text size={400}>Select an entity to view its attributes</Text>
              </div>
            ) : loadingAttributes ? (
              <div className={styles.emptyState}>
                <Spinner size="large" label="Loading attributes..." />
              </div>
            ) : (
              <>
                <Section
                  title={`Attributes for ${selectedEntity} (${attributes.length})`}
                  icon={<Database24Regular />}
                >
                  {attributes.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Text>No attributes found</Text>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="Search attributes..."
                        value={searchTermAttributes}
                        onChange={(_, data) => setSearchTermAttributes(data.value)}
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
                          console.log('[EntityBrowser] DataGrid selection changed:', data);
                          const selectedIds = Array.from(data.selectedItems);
                          if (selectedIds.length > 0) {
                            const logicalName = selectedIds[0] as string;
                            const selectedItem = attributeItems.find(item => item.logicalName === logicalName);
                            if (selectedItem) {
                              if (!selectedItem.isLocked) {
                                handleAttributeSelect(selectedItem);
                              } else {
                                // Clear selection for locked attributes
                                const reason = !selectedItem.isCustomizable 
                                  ? 'This attribute is not customizable and cannot be translated'
                                  : 'This attribute has no base display name and cannot be translated';
                                setInfo(reason);
                                setTimeout(() => setInfo(null), 3000);
                              }
                            }
                          }
                        }}
                      >
                        <DataGridHeader>
                          <DataGridRow>
                            {({ renderHeaderCell }) => (
                              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
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
                    </>
                  )}
                </Section>

                {/* Attribute Translation Editor */}
                {selectedAttribute && (
                  <div className={styles.attributeRow} data-entity-editor>
                    <Section
                      title={`Translation Editor: ${selectedAttribute}`}
                      icon={<Database24Regular />}
                    >
                      <EntityLabelEditor
                        clientUrl={clientUrl}
                        entity={selectedEntity}
                        attribute={selectedAttribute}
                      />
                    </Section>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
