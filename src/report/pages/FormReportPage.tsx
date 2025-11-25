import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Text,
  Card,
  CardHeader,
  Divider,
  makeStyles,
  shorthands,
  tokens,
  Button,
  Input,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Badge,
  Body1,
  Caption1,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components";
import {
  ChevronRight20Regular,
  ChevronDown20Regular,
  Copy20Regular,
  ChevronDoubleDown20Regular,
  ChevronDoubleUp20Regular,
  Search20Regular,
  Save20Regular,
} from "@fluentui/react-icons";

import { ErrorBox, Info } from "../../components/ui/Notice";
import { useOrgContext } from "../../hooks/useOrgContext";
import { useFormStructure } from "../../hooks/useFormStructure";
import { getDisplayLabel, buildPath, saveFormStructure } from "../../services/formStructureService";
import { publishEntityViaWebApi } from "../../services/d365Api";
import { getLanguageDisplayName } from "../../utils/languageNames";
import TranslationsTable from "../../components/TranslationsTable";
import type { FormTab, FormSection, FormControl, Label } from "../../types";

const useStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    ...shorthands.padding("16px", "24px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  metaRow: {
    display: "flex",
    ...shorthands.gap("16px"),
    fontSize: "12px",
    color: tokens.colorNeutralForeground3,
  },
  content: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    width: "320px",
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    ...shorthands.padding("12px", "16px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke1),
  },
  searchBox: {
    marginTop: "8px",
  },
  treeContainer: {
    flex: 1,
    overflowY: "auto",
    ...shorthands.padding("8px"),
  },
  treeItem: {
    ...shorthands.padding("6px", "8px"),
    ...shorthands.borderRadius("4px"),
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("6px"),
    fontSize: "13px",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  treeItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  treeItemNested: {
    paddingLeft: "32px",
  },
  treeItemNested2: {
    paddingLeft: "56px",
  },
  detailsPane: {
    flex: 1,
    overflowY: "auto",
    ...shorthands.padding("24px"),
  },
  detailsCard: {
    marginBottom: "16px",
  },
  labelTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "8px",
    fontSize: "13px",
  },
  labelTableRow: {
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },
  labelTableCell: {
    ...shorthands.padding("8px"),
  },
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("4px"),
    fontSize: "12px",
    fontFamily: "monospace",
    overflowX: "auto",
    maxHeight: "400px",
    overflowY: "auto",
  },
  actionBar: {
    display: "flex",
    ...shorthands.gap("8px"),
    marginBottom: "16px",
  },
  emptyState: {
    textAlign: "center",
    ...shorthands.padding("48px", "24px"),
    color: tokens.colorNeutralForeground3,
  },
});

type SelectedItem =
  | { type: "tab"; tab: FormTab; path: string[] }
  | { type: "section"; tab: FormTab; section: FormSection; path: string[] }
  | { type: "control"; tab: FormTab; section: FormSection; control: FormControl; path: string[] }
  | null;

export default function FormReportPage(): JSX.Element {
  const styles = useStyles();
  const { clientUrl, entity, formId } = useOrgContext();
  const { state, load, resetError } = useFormStructure();

  // Set document title
  useEffect(() => {
    document.title = 'Form Structure - D365 Translator';
  }, []);
  const { structure, loading, error } = state;

  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [editedStructure, setEditedStructure] = useState(structure);
  const [showRawXml, setShowRawXml] = useState(false);

  // Sync editedStructure when structure loads
  useEffect(() => {
    if (structure) {
      setEditedStructure(JSON.parse(JSON.stringify(structure))); // Deep clone
    }
  }, [structure]);

  // Load form structure on mount
  useEffect(() => {
    if (clientUrl && formId) {
      load(clientUrl, formId);
    }
  }, [clientUrl, formId, load]);

  // Validation
  const problems: string[] = [];
  if (!clientUrl) problems.push("Missing clientUrl parameter.");
  if (!formId) problems.push("Missing formId parameter. Please open this page from a Dataverse form.");

  // Filter logic
  const filteredStructure = useMemo(() => {
    const baseStructure = editedStructure || structure;
    if (!baseStructure || !searchQuery.trim()) return baseStructure;

    const query = searchQuery.toLowerCase();
    const matchedTabs: FormTab[] = [];

    for (const tab of baseStructure.tabs) {
      const tabLabel = getDisplayLabel(tab.labels);
      const tabMatches = tabLabel.toLowerCase().includes(query) || tab.name?.toLowerCase().includes(query);

      const matchedColumns = tab.columns.map((col) => {
        const matchedSections = col.sections.filter((section) => {
          const sectionLabel = getDisplayLabel(section.labels);
          const sectionMatches =
            sectionLabel.toLowerCase().includes(query) || section.name?.toLowerCase().includes(query);

          const controlMatches = section.controls.some((control) => {
            const controlLabel = getDisplayLabel(control.labels);
            return (
              controlLabel.toLowerCase().includes(query) ||
              control.name?.toLowerCase().includes(query) ||
              control.datafieldname?.toLowerCase().includes(query)
            );
          });

          return sectionMatches || controlMatches;
        });

        return { ...col, sections: matchedSections };
      });

      if (tabMatches || matchedColumns.some((c) => c.sections.length > 0)) {
        matchedTabs.push({ ...tab, columns: matchedColumns });
      }
    }

    return { ...baseStructure, tabs: matchedTabs };
  }, [structure, editedStructure, searchQuery]);

  // Auto-expand and select first match when searching
  useEffect(() => {
    if (!filteredStructure || !searchQuery.trim()) return;

    const newExpandedTabs = new Set<string>();
    const newExpandedSections = new Set<string>();

    // Expand all tabs and sections that have matches
    for (const tab of filteredStructure.tabs) {
      if (tab.columns.some((c) => c.sections.length > 0)) {
        newExpandedTabs.add(tab.id);
        // Expand sections that have matches
        for (const col of tab.columns) {
          for (const section of col.sections) {
            newExpandedSections.add(`${tab.id}-${section.id}`);
          }
        }
      }
    }

    setExpandedTabs(newExpandedTabs);
    setExpandedSections(newExpandedSections);
  }, [filteredStructure, searchQuery]);

  // Expand/collapse all
  const handleExpandAll = () => {
    if (!filteredStructure) return;
    const allTabIds = new Set(filteredStructure.tabs.map((t) => t.id));
    const allSectionIds = new Set(
      filteredStructure.tabs.flatMap((t) => t.columns.flatMap((c) => c.sections.map((s) => `${t.id}-${s.id}`)))
    );
    setExpandedTabs(allTabIds);
    setExpandedSections(allSectionIds);
  };

  const handleCollapseAll = () => {
    setExpandedTabs(new Set());
    setExpandedSections(new Set());
  };

  const toggleTab = (tabId: string) => {
    setExpandedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  };

  const toggleSection = (tabId: string, sectionId: string) => {
    const key = `${tabId}-${sectionId}`;
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleCopyPath = () => {
    if (!selectedItem) return;
    const pathString = buildPath(selectedItem.path);
    navigator.clipboard.writeText(pathString).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleSave = useCallback(async () => {
    if (!clientUrl || !formId || !editedStructure || !entity) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setSaveStatus(null);

    try {
      await saveFormStructure(clientUrl, formId, editedStructure, (status) => {
        setSaveStatus(status);
      });
      setSaveStatus('Publishing...');
      // Publish the entity after saving
      await publishEntityViaWebApi(clientUrl, entity);
      setSaveStatus(null);
      setSaveSuccess(true);
      // Reload to get fresh data
      load(clientUrl, formId);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save form structure");
      setSaveStatus(null);
    } finally {
      setIsSaving(false);
    }
  }, [clientUrl, formId, entity, editedStructure, load]);



  const updateLabel = useCallback(
    (path: { tabIdx: number; colIdx?: number; secIdx?: number; ctrlIdx?: number }, lcid: number, newValue: string) => {
      if (!editedStructure) return;

      const cloned = JSON.parse(JSON.stringify(editedStructure));
      const { tabIdx, colIdx, secIdx, ctrlIdx } = path;

      let labels: Label[] | undefined;

      if (ctrlIdx !== undefined && colIdx !== undefined && secIdx !== undefined) {
        // Control label
        labels = cloned.tabs[tabIdx]?.columns[colIdx]?.sections[secIdx]?.controls[ctrlIdx]?.labels;
      } else if (secIdx !== undefined && colIdx !== undefined) {
        // Section label
        labels = cloned.tabs[tabIdx]?.columns[colIdx]?.sections[secIdx]?.labels;
      } else {
        // Tab label
        labels = cloned.tabs[tabIdx]?.labels;
      }

      if (labels) {
        const existing = labels.find((l) => l.languageCode === lcid);
        if (existing) {
          existing.label = newValue;
        }
      }

      setEditedStructure(cloned);
    },
    [editedStructure]
  );

  // Get fresh data from editedStructure for the selected item
  const getCurrentItemData = useCallback(() => {
    if (!selectedItem || !editedStructure) return selectedItem;

    const { type } = selectedItem;
    
    if (type === 'tab') {
      const freshTab = editedStructure.tabs.find((t) => t.id === selectedItem.tab.id);
      if (freshTab) {
        return { ...selectedItem, tab: freshTab };
      }
    } else if (type === 'section') {
      const freshTab = editedStructure.tabs.find((t) => t.id === selectedItem.tab.id);
      if (freshTab) {
        for (const col of freshTab.columns) {
          const freshSection = col.sections.find((s) => s.id === selectedItem.section.id);
          if (freshSection) {
            return { ...selectedItem, tab: freshTab, section: freshSection };
          }
        }
      }
    } else if (type === 'control') {
      const freshTab = editedStructure.tabs.find((t) => t.id === selectedItem.tab.id);
      if (freshTab) {
        for (const col of freshTab.columns) {
          const freshSection = col.sections.find((s) => s.id === selectedItem.section.id);
          if (freshSection) {
            const freshControl = freshSection.controls.find((c) => c.id === selectedItem.control.id);
            if (freshControl) {
              return { ...selectedItem, tab: freshTab, section: freshSection, control: freshControl };
            }
          }
        }
      }
    }

    return selectedItem;
  }, [selectedItem, editedStructure]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <Text size={400} weight="semibold">Form Structure Viewer</Text>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              appearance="primary"
              icon={<Save20Regular />}
              onClick={handleSave}
              disabled={isSaving || loading || !editedStructure}
            >
              {isSaving ? "Saving & Publishing..." : "Save All Languages"}
            </Button>
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner size="tiny" />
                <Caption1>Loading form…</Caption1>
              </div>
            )}
          </div>
        </div>
        <div className={styles.metaRow}>
          <span>Entity: <code>{entity || "(unknown)"}</code></span>
          <span>FormId: <code>{formId || "(none)"}</code></span>
        </div>
      </div>

      {/* Success/Error messages */}
      {saveSuccess && (
        <MessageBar intent="success" style={{ margin: "16px" }}>
          <MessageBarBody>
            <MessageBarTitle>Saved & Published successfully</MessageBarTitle>
            Form structure has been updated for all languages and published.
          </MessageBarBody>
        </MessageBar>
      )}

      {saveError && (
        <MessageBar intent="error" style={{ margin: "16px" }}>
          <MessageBarBody>
            <MessageBarTitle>Save failed</MessageBarTitle>
            {saveError}
          </MessageBarBody>
        </MessageBar>
      )}

      {saveStatus && (
        <div style={{ margin: "16px" }}>
          <Info title="Saving">
            {saveStatus}
          </Info>
        </div>
      )}

      {/* Error state */}
      {problems.length > 0 && (
        <div style={{ padding: "16px" }}>
          <ErrorBox>{problems.join(" ")}</ErrorBox>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px" }}>
          <ErrorBox title="Failed to load form">{error}</ErrorBox>
        </div>
      )}

      {/* Main content */}
      {!problems.length && !error && (
        <div className={styles.content}>
          {/* Left sidebar - tree navigation */}
          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Tooltip content="Expand all" relationship="label">
                  <Button
                    size="small"
                    icon={<ChevronDoubleDown20Regular />}
                    onClick={handleExpandAll}
                    disabled={!filteredStructure}
                  />
                </Tooltip>
                <Tooltip content="Collapse all" relationship="label">
                  <Button
                    size="small"
                    icon={<ChevronDoubleUp20Regular />}
                    onClick={handleCollapseAll}
                    disabled={!filteredStructure}
                  />
                </Tooltip>
              </div>
              <Input
                className={styles.searchBox}
                placeholder="Search tabs, sections, fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                contentBefore={<Search20Regular />}
                size="small"
              />
            </div>

            <div className={styles.treeContainer}>
              {loading && (
                <div className={styles.emptyState}>
                  <Spinner />
                </div>
              )}

              {!loading && filteredStructure && filteredStructure.tabs.length === 0 && (
                <div className={styles.emptyState}>
                  <Caption1>No tabs found</Caption1>
                </div>
              )}

              {!loading &&
                filteredStructure &&
                filteredStructure.tabs.map((tab) => {
                  const isTabExpanded = expandedTabs.has(tab.id);
                  const tabLabel = getDisplayLabel(tab.labels) || tab.name || tab.id;

                  return (
                    <div key={tab.id}>
                      {/* Tab */}
                      <div
                        className={`${styles.treeItem} ${
                          selectedItem?.type === "tab" && selectedItem.tab.id === tab.id
                            ? styles.treeItemSelected
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem({ type: "tab", tab, path: [tabLabel] });
                          toggleTab(tab.id);
                        }}
                      >
                        {isTabExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                        <Text weight="semibold">{tabLabel}</Text>
                        <Badge size="small" appearance="tint" color="informative">
                          Tab
                        </Badge>
                      </div>

                      {/* Sections */}
                      {isTabExpanded &&
                        tab.columns.map((col, colIdx) =>
                          col.sections.map((section) => {
                            const sectionKey = `${tab.id}-${section.id}`;
                            const isSectionExpanded = expandedSections.has(sectionKey);
                            const sectionLabel = getDisplayLabel(section.labels) || section.name || section.id;

                            return (
                              <div key={sectionKey}>
                                {/* Section */}
                                <div
                                  className={`${styles.treeItem} ${styles.treeItemNested} ${
                                    selectedItem?.type === "section" && selectedItem.section.id === section.id
                                      ? styles.treeItemSelected
                                      : ""
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem({
                                      type: "section",
                                      tab,
                                      section,
                                      path: [tabLabel, sectionLabel],
                                    });
                                    toggleSection(tab.id, section.id);
                                  }}
                                >
                                  {isSectionExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                  <Text>{sectionLabel}</Text>
                                  <Badge size="small" appearance="tint">
                                    Section
                                  </Badge>
                                </div>

                                {/* Controls */}
                                {isSectionExpanded &&
                                  section.controls.map((control) => {
                                    const controlLabel =
                                      getDisplayLabel(control.labels) ||
                                      control.datafieldname ||
                                      control.name ||
                                      control.id;

                                    return (
                                      <div
                                        key={control.id}
                                        className={`${styles.treeItem} ${styles.treeItemNested2} ${
                                          selectedItem?.type === "control" && selectedItem.control.id === control.id
                                            ? styles.treeItemSelected
                                            : ""
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItem({
                                            type: "control",
                                            tab,
                                            section,
                                            control,
                                            path: [tabLabel, sectionLabel, controlLabel],
                                          });
                                        }}
                                      >
                                        <Text size={200}>{controlLabel}</Text>
                                        {control.datafieldname && (
                                          <Badge size="tiny" appearance="outline">
                                            Field
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            );
                          })
                        )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right pane - details */}
          <div className={styles.detailsPane}>
            {!selectedItem && !loading && (
              <div className={styles.emptyState}>
                <Caption1>Select a tab, section, or control to view details</Caption1>
              </div>
            )}

            {selectedItem && (() => {
              const currentItem = getCurrentItemData();
              if (!currentItem) return null;

              return (
                <>
                  <div className={styles.actionBar}>
                    <Button
                      icon={<Copy20Regular />}
                      onClick={handleCopyPath}
                      appearance="subtle"
                    >
                      {copySuccess ? "Copied!" : "Copy Path"}
                    </Button>
                  </div>

                  <Card className={styles.detailsCard}>
                    <CardHeader
                      header={<Text weight="semibold">Path</Text>}
                      description={<code>{buildPath(currentItem.path)}</code>}
                    />
                  </Card>

                  {currentItem.type === "tab" && (
                    <TabDetails
                      tab={currentItem.tab}
                      styles={styles}
                      isSaving={isSaving}
                      onUpdateLabel={(lcid: number, value: string) => {
                        const tabIdx = editedStructure?.tabs.findIndex((t) => t.id === currentItem.tab.id);
                        if (tabIdx !== undefined && tabIdx !== -1) {
                          updateLabel({ tabIdx }, lcid, value);
                        }
                      }}
                    />
                  )}
                  {currentItem.type === "section" && (
                    <SectionDetails
                      section={currentItem.section}
                      styles={styles}
                      isSaving={isSaving}
                      onUpdateLabel={(lcid: number, value: string) => {
                        const tabIdx = editedStructure?.tabs.findIndex((t) => t.id === currentItem.tab.id);
                        if (tabIdx === undefined || tabIdx === -1) return;
                        const tab = editedStructure!.tabs[tabIdx];
                        let colIdx = -1;
                        let secIdx = -1;
                        tab.columns.forEach((col, ci) => {
                          col.sections.forEach((sec, si) => {
                            if (sec.id === currentItem.section.id) {
                              colIdx = ci;
                              secIdx = si;
                            }
                          });
                        });
                        if (colIdx !== -1 && secIdx !== -1) {
                          updateLabel({ tabIdx, colIdx, secIdx }, lcid, value);
                        }
                      }}
                    />
                  )}
                  {currentItem.type === "control" && (
                    <ControlDetails
                      control={currentItem.control}
                      styles={styles}
                      isSaving={isSaving}
                      clientUrl={clientUrl}
                      entity={entity}
                      formId={formId}
                      onUpdateLabel={(lcid: number, value: string) => {
                        const tabIdx = editedStructure?.tabs.findIndex((t) => t.id === currentItem.tab.id);
                        if (tabIdx === undefined || tabIdx === -1) return;
                        const tab = editedStructure!.tabs[tabIdx];
                        let colIdx = -1;
                        let secIdx = -1;
                        let ctrlIdx = -1;
                        tab.columns.forEach((col, ci) => {
                          col.sections.forEach((sec, si) => {
                            if (sec.id === currentItem.section.id) {
                              colIdx = ci;
                              secIdx = si;
                              ctrlIdx = sec.controls.findIndex((c) => c.id === currentItem.control.id);
                            }
                          });
                        });
                        if (colIdx !== -1 && secIdx !== -1 && ctrlIdx !== -1) {
                          updateLabel({ tabIdx, colIdx, secIdx, ctrlIdx }, lcid, value);
                        }
                      }}
                    />
                  )}

                  {/* Raw XML Debug Section */}
                  {structure?.rawXmlByLcid && (
                    <Card className={styles.detailsCard}>
                      <CardHeader
                        header={<Text weight="semibold">Debug: Raw Form XML</Text>}
                        description="View the complete form XML retrieved for each provisioned language (for debugging purposes)"
                      />
                      <Divider />
                      <div style={{ padding: "12px" }}>
                        <Button
                          appearance="subtle"
                          onClick={() => setShowRawXml(!showRawXml)}
                        >
                          {showRawXml ? "Hide Raw XML" : "Show Raw XML"}
                        </Button>
                      </div>
                      {showRawXml && (
                        <>
                          <Divider />
                          <div style={{ padding: "12px" }}>
                            <Accordion collapsible multiple>
                              {Object.entries(structure.rawXmlByLcid)
                                .sort(([lcidA], [lcidB]) => Number(lcidA) - Number(lcidB))
                                .map(([lcid, xml]) => (
                                  <AccordionItem key={lcid} value={`xml-${lcid}`}>
                                    <AccordionHeader>
                                      <Text>Language {lcid}</Text>
                                    </AccordionHeader>
                                    <AccordionPanel>
                                      <pre className={styles.codeBlock}>{xml}</pre>
                                    </AccordionPanel>
                                  </AccordionItem>
                                ))}
                            </Accordion>
                          </div>
                        </>
                      )}
                    </Card>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function TabDetails({
  tab,
  styles,
  isSaving,
  onUpdateLabel,
}: {
  tab: FormTab;
  styles: ReturnType<typeof useStyles>;
  isSaving: boolean;
  onUpdateLabel: (lcid: number, value: string) => void;
}) {
  return (
    <>
      <Card className={styles.detailsCard}>
        <CardHeader header={<Text weight="semibold">Tab Properties</Text>} />
        <Divider />
        <table className={styles.labelTable}>
          <tbody>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>ID</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{tab.id}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Name</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{tab.name || "(none)"}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Visible</Caption1>
              </td>
              <td className={styles.labelTableCell}>{String(tab.visible ?? true)}</td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Show Label</Caption1>
              </td>
              <td className={styles.labelTableCell}>{String(tab.showlabel ?? true)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <LabelsList labels={tab.labels} isSaving={isSaving} onUpdateLabel={onUpdateLabel} />
    </>
  );
}

function SectionDetails({
  section,
  styles,
  isSaving,
  onUpdateLabel,
}: {
  section: FormSection;
  styles: ReturnType<typeof useStyles>;
  isSaving: boolean;
  onUpdateLabel: (lcid: number, value: string) => void;
}) {
  return (
    <>
      <Card className={styles.detailsCard}>
        <CardHeader header={<Text weight="semibold">Section Properties</Text>} />
        <Divider />
        <table className={styles.labelTable}>
          <tbody>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>ID</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{section.id}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Name</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{section.name || "(none)"}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Visible</Caption1>
              </td>
              <td className={styles.labelTableCell}>{String(section.visible ?? true)}</td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Show Label</Caption1>
              </td>
              <td className={styles.labelTableCell}>{String(section.showlabel ?? true)}</td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Controls</Caption1>
              </td>
              <td className={styles.labelTableCell}>{section.controls.length}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <LabelsList labels={section.labels} isSaving={isSaving} onUpdateLabel={onUpdateLabel} />
    </>
  );
}

function ControlDetails({
  control,
  styles,
  isSaving,
  clientUrl,
  entity,
  formId,
  onUpdateLabel,
}: {
  control: FormControl;
  styles: ReturnType<typeof useStyles>;
  isSaving: boolean;
  clientUrl?: string;
  entity?: string;
  formId?: string;
  onUpdateLabel: (lcid: number, value: string) => void;
}) {
  return (
    <>
      <Card className={styles.detailsCard}>
        <CardHeader header={<Text weight="semibold">Control Properties</Text>} />
        <Divider />
        <table className={styles.labelTable}>
          <tbody>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>ID</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{control.id}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Name</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{control.name || "(none)"}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Data Field</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{control.datafieldname || "(none)"}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Class ID</Caption1>
              </td>
              <td className={styles.labelTableCell}>
                <code>{control.classId || "(none)"}</code>
              </td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Visible</Caption1>
              </td>
              <td className={styles.labelTableCell}>{String(control.visible ?? true)}</td>
            </tr>
            <tr className={styles.labelTableRow}>
              <td className={styles.labelTableCell}>
                <Caption1>Disabled</Caption1>
              </td>
              <td className={styles.labelTableCell}>{String(control.disabled ?? false)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <LabelsList 
        labels={control.labels} 
        isSaving={isSaving} 
        onUpdateLabel={onUpdateLabel}
        clientUrl={clientUrl}
        entity={entity}
        formId={formId}
        attribute={control.datafieldname}
        cellId={control.cellId}
      />
    </>
  );
}

function LabelsList({
  labels,
  isSaving,
  onUpdateLabel,
  defaultLcid = 1033,
  clientUrl,
  entity,
  formId,
  attribute,
  cellId,
}: {
  labels: Label[];
  isSaving?: boolean;
  onUpdateLabel?: (lcid: number, value: string) => void;
  defaultLcid?: number;
  clientUrl?: string;
  entity?: string;
  formId?: string;
  attribute?: string;
  cellId?: string;
}) {
  const openFieldReport = () => {
    if (!clientUrl || !entity || !attribute || !formId) return;
    
    // Build the field report URL with cellId as labelId
    const params = new URLSearchParams({
      clientUrl,
      entity,
      attribute,
      formId,
      ...(cellId && { labelId: cellId }),
    });
    
    const url = `${window.location.origin}${window.location.pathname}#/report/field?${params.toString()}`;
    window.open(url, '_blank');
  };

  if (labels.length === 0) {
    return (
      <Card>
        <CardHeader
          header={<Text weight="semibold">Labels (0)</Text>}
          description="All language translations defined in the form XML"
        />
        <Divider />
        <Caption1 style={{ padding: "12px" }}>No labels defined</Caption1>
      </Card>
    );
  }

  // Convert Label[] to the format TranslationsTable expects
  const lcids = labels.map(l => l.languageCode);
  const values = labels.reduce((acc, l) => {
    acc[l.languageCode] = l.label;
    return acc;
  }, {} as Record<number, string>);

  return (
    <Card>
      <CardHeader
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Text weight="semibold">Labels ({labels.length})</Text>
            {clientUrl && entity && attribute && formId && (
              <Button
                appearance="subtle"
                size="small"
                onClick={openFieldReport}
              >
                Open in Field Editor
              </Button>
            )}
          </div>
        }
        description="All language translations defined in the form XML"
      />
      <Divider />
      <div style={{ padding: "12px" }}>
        <TranslationsTable
          lcids={lcids}
          values={values}
          onChange={(lcid, value) => {
            if (onUpdateLabel) {
              onUpdateLabel(lcid, value);
            }
          }}
          defaultLcid={defaultLcid}
          readOnly={isSaving}
          disabled={isSaving}
        />
      </div>
    </Card>
  );
}

