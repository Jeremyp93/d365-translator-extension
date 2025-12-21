/**
 * EntityAttributeBrowserPage - Browse and translate entity attributes
 * Refactored to use extracted components and custom hooks
 */

import { useEffect, useState, useMemo } from "react";
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  CounterBadge,
} from "@fluentui/react-components";
import {
  TableEdit24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  Cart24Regular,
} from "@fluentui/react-icons";

import { ErrorBox, Info } from "../../components/ui/Notice";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import EntityLabelEditor from "../../components/EntityLabelEditor";
import PendingChangesCartModal from "../../components/PendingChangesCartModal";
import EntitySelector from "../../components/entity-browser/EntitySelector";
import AttributeDataGrid from "../../components/entity-browser/AttributeDataGrid";
import AttributeDependenciesPanel from "../../components/entity-browser/AttributeDependenciesPanel";
import type { AttributeItem } from "../../components/entity-browser/AttributeDataGrid";
import { PendingChangesProvider, usePendingChanges } from "../../hooks/usePendingChanges";
import type { PendingChange } from "../../types";

import { useOrgContext } from "../../hooks/useOrgContext";
import { useTheme } from "../../context/ThemeContext";
import { spacing } from "../../styles/theme";
import { useEntityBrowser } from "../../hooks/useEntityBrowser";
import { useEntityAttributes } from "../../hooks/useEntityAttributes";
import { useAttributeDependencies } from "../../hooks/useAttributeDependencies";
import { getErrorMessage } from "../../utils/errorHandling";

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
    gridTemplateAreas: `
      "sidebar detail"
      "dependencies dependencies"
    `,
    ...shorthands.gap(spacing.lg),
    '@media (min-width: 1600px)': {
      gridTemplateColumns: 'minmax(250px, 400px) minmax(0, 1fr) minmax(250px, 340px)',
      gridTemplateAreas: `"sidebar detail dependencies"`,
    },
    "@media (max-width: 1024px)": {
      gridTemplateColumns: "minmax(200px, 300px) minmax(0, 1fr)",
      gridTemplateAreas: `
        "sidebar detail"
        "dependencies dependencies"
      `,
    },
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      gridTemplateAreas: `
        "sidebar"
        "detail"
        "dependencies"
      `,
    },
  },
  sidebar: {
    gridArea: 'sidebar',
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
  },
  detailPanel: {
    gridArea: 'detail',
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
    minWidth: 0,
    overflow: "hidden",
  },
  dependenciesPanel: {
    gridArea: 'dependencies',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  },
  attributeRow: {
    marginBottom: "32px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  emptyState: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
    color: tokens.colorNeutralForeground3,
  },
});

function EntityAttributeBrowserPageContent(): JSX.Element {
  const styles = useStyles();
  const { clientUrl, apiVersion } = useOrgContext();
  const { mode, toggleTheme } = useTheme();
  const { changes, count: pendingCount, addChanges, removeChange, clearAll } = usePendingChanges();

  // Custom hooks handle all data fetching
  const { entities, loading: entitiesLoading, error: entitiesError } = useEntityBrowser(clientUrl, apiVersion);

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const { attributes, loading: attributesLoading, error: attributesError } = useEntityAttributes(
    clientUrl,
    selectedEntity,
    apiVersion
  );

  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);

  // Get metadata ID for selected attribute
  const selectedAttrMetadataId = useMemo(() => {
    if (!selectedAttribute) return null;
    const attr = attributes.find(a => a.LogicalName === selectedAttribute);
    return attr?.MetadataId ?? null;
  }, [attributes, selectedAttribute]);

  const { dependencies, loading: depsLoading, error: depsError } = useAttributeDependencies(
    clientUrl,
    selectedAttrMetadataId,
    apiVersion
  );

  // UI state
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [editorReloadTrigger, setEditorReloadTrigger] = useState(0);
  const [info, setInfo] = useState<string | null>(null);

  // Set document title
  useEffect(() => {
    document.title = 'Entity Browser - D365 Translator';
  }, []);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pendingCount]);

  // Handlers
  const handleAddToCart = (newChanges: PendingChange[]) => {
    addChanges(newChanges);
  };

  const handleOpenCart = () => {
    setCartModalOpen(true);
  };

  const handleCloseCart = () => {
    setCartModalOpen(false);
  };

  const handleCartSaveSuccess = async (successfulChanges: PendingChange[]) => {
    if (!clientUrl || !selectedEntity) return;

    try {
      // Trigger EntityLabelEditor reload ONLY if the currently selected attribute was successfully saved
      if (selectedAttribute) {
        const wasCurrentAttributeSaved = successfulChanges.some(
          (change) => change.entity === selectedEntity && change.attribute === selectedAttribute
        );

        if (wasCurrentAttributeSaved) {
          setEditorReloadTrigger(prev => prev + 1);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to reload after save:', getErrorMessage(error));
    }
  };

  const handleEntitySelect = (logicalName: string) => {
    setSelectedEntity(logicalName);
    setSelectedAttribute(null);
  };

  const handleAttributeSelect = (item: AttributeItem) => {
    setSelectedAttribute(item.logicalName);

    // Scroll editor into view after a short delay
    setTimeout(() => {
      const editorEl = document.querySelector('[data-entity-editor]');
      if (editorEl) {
        editorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleLockedAttributeClick = (reason: string) => {
    setInfo(reason);
    setTimeout(() => setInfo(null), 3000);
  };

  return (
    <main className={styles.page}>
      <PageHeader
        title="Entity & Attribute Browser"
        subtitle="Browse and translate entity attributes across all entities"
        icon={<TableEdit24Regular />}
        connectionInfo={{ clientUrl, apiVersion }}
        actions={
          <div className={styles.headerActions}>
            <Button
              appearance="subtle"
              icon={<Cart24Regular />}
              onClick={handleOpenCart}
              title={`Review pending changes (${pendingCount})`}
            >
              {pendingCount > 0 && (
                <CounterBadge
                  count={pendingCount}
                  color="brand"
                  appearance="filled"
                />
              )}
            </Button>
            <Button
              appearance="subtle"
              icon={mode === "dark" ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
              onClick={toggleTheme}
              title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            />
          </div>
        }
      />

      <div className={styles.content}>
        {/* Error and Info Messages */}
        {entitiesError && <ErrorBox>{entitiesError}</ErrorBox>}
        {attributesError && <ErrorBox>{attributesError}</ErrorBox>}
        {info && <Info>{info}</Info>}

        <div className={styles.splitLayout}>
          {/* Left Sidebar - Entity List */}
          <aside className={styles.sidebar}>
            <EntitySelector
              entities={entities}
              selectedEntity={selectedEntity}
              onSelectEntity={handleEntitySelect}
              loading={entitiesLoading}
            />
          </aside>

          {/* Center Panel - Attributes */}
          <section className={styles.detailPanel} aria-label="Attributes Panel">
            {!selectedEntity ? (
              <div className={styles.emptyState}>
                <p>Select an entity to view its attributes</p>
              </div>
            ) : attributesLoading ? (
              <div className={styles.emptyState}>
                <p>Loading attributes...</p>
              </div>
            ) : (
              <>
                <AttributeDataGrid
                  attributes={attributes}
                  selectedAttribute={selectedAttribute}
                  onSelectAttribute={handleAttributeSelect}
                  onLockedAttributeClick={handleLockedAttributeClick}
                />

                {/* Attribute Translation Editor */}
                {selectedAttribute && (
                  <div className={styles.attributeRow} data-entity-editor>
                    <Section title={`Translation Editor: ${selectedAttribute}`}>
                      <EntityLabelEditor
                        clientUrl={clientUrl}
                        entity={selectedEntity}
                        attribute={selectedAttribute}
                        bulkMode={true}
                        onAddToCart={handleAddToCart}
                        reloadTrigger={editorReloadTrigger}
                        pendingChanges={Array.from(changes.values()).filter(
                          (change) => change.entity === selectedEntity && change.attribute === selectedAttribute
                        )}
                      />
                    </Section>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Right Panel - Dependencies */}
          {selectedAttribute && selectedEntity && (
            <section className={styles.dependenciesPanel} aria-label="Dependencies Panel">
              <AttributeDependenciesPanel
                dependencies={dependencies}
                loading={depsLoading}
                error={depsError}
                selectedEntity={selectedEntity}
                clientUrl={clientUrl}
                apiVersion={apiVersion}
              />
            </section>
          )}
        </div>
      </div>

      {/* Pending Changes Cart Modal */}
      <PendingChangesCartModal
        open={cartModalOpen}
        onClose={handleCloseCart}
        changes={changes}
        onRemoveChange={removeChange}
        onClearAll={clearAll}
        onSaveSuccess={handleCartSaveSuccess}
        clientUrl={clientUrl}
        apiVersion={apiVersion}
      />
    </main>
  );
}

// Wrapper component with PendingChangesProvider
export default function EntityAttributeBrowserPage(): JSX.Element {
  return (
    <PendingChangesProvider>
      <EntityAttributeBrowserPageContent />
    </PendingChangesProvider>
  );
}
