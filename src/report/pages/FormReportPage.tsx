import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Caption1,
  Card,
  CardHeader,
  Combobox,
  Divider,
  Dropdown,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  OptionGroup,
  shorthands,
  Spinner,
  Text,
  tokens,
  Tooltip,
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
} from '@fluentui/react-components';
import {
  ArrowExport20Regular,
  CheckmarkCircle20Regular,
  ChevronDoubleDown20Regular,
  ChevronDoubleUp20Regular,
  ChevronDown20Regular,
  ChevronRight20Regular,
  Copy20Regular,
  DocumentTable24Regular,
  ErrorCircle20Regular,
  Info20Regular,
  Save20Regular,
  Search20Regular,
  Warning20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons';

import PageHeader from '../../components/ui/PageHeader';
import { ErrorBox } from '../../components/ui/Notice';
import { useOrgContext } from '../../hooks/useOrgContext';
import { useFormStructure } from '../../hooks/useFormStructure';
import { useTheme } from '../../context/ThemeContext';
import { useTreeExpansion } from '../../hooks/useTreeExpansion';
import { useFormStructureSearch } from '../../hooks/useFormStructureSearch';
import { spacing } from '../../styles/theme';

import type { FormControl, FormSection, FormTab, Label } from '../../types';
import type { EntitySummary } from '../../services/entityMetadataService';
import { getEntityDisplayName, listAllEntities } from '../../services/entityMetadataService';
import type { SystemForm } from '../../services/d365Api';
import { getFormsForEntity, isFormCustomizable, publishEntityViaWebApi } from '../../services/d365Api';
import { buildPath, getDisplayLabel, saveFormStructure } from '../../services/formStructureService';
import { getControlTypeName, isEditableControlType } from '../../utils/controlClassIds';
import { replaceHashQuery } from '../../utils/hashQueryUtils';
import { getFormTypeLabel } from '../../utils/formTypeUtils';
import { deepClone } from '../../utils/objectUtils';
import SaveStatusBar from '../../components/form-structure/SaveStatusBar';
import TabDetails from '../../components/form-structure/detail-sections/TabDetails';
import SectionDetails from '../../components/form-structure/detail-sections/SectionDetails';
import ControlDetails from '../../components/form-structure/detail-sections/ControlDetails';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  content: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    '@media (max-width: 1024px)': {
      flexDirection: 'column',
    },
  },
  sidebar: {
    width: '360px',
    minWidth: '300px',
    maxWidth: '360px',
    ...shorthands.borderRight('2px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: tokens.shadow8,
    '@media (max-width: 1200px)': {
      width: '300px',
      minWidth: '280px',
      maxWidth: '300px',
    },
    '@media (max-width: 1024px)': {
      width: '100%',
      minWidth: 'unset',
      maxWidth: 'unset',
      height: '40vh',
      ...shorthands.borderRight('none'),
      ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1),
    },
  },
  sidebarHeader: {
    ...shorthands.padding(spacing.md, spacing.lg),
    ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'relative',
    zIndex: 100,
  },
  sidebarTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: spacing.sm,
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(spacing.sm),
  },
  searchBox: {
    marginTop: spacing.sm,
  },
  expandButtons: {
    display: 'flex',
    ...shorthands.gap(spacing.sm),
    marginBottom: spacing.sm,
  },
  treeContainer: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(spacing.sm),
    '::-webkit-scrollbar': { width: '8px' },
    '::-webkit-scrollbar-track': { backgroundColor: tokens.colorNeutralBackground1 },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStroke1,
      ...shorthands.borderRadius('4px'),
      ':hover': { backgroundColor: tokens.colorNeutralStroke2 },
    },
  },
  treeItem: {
    ...shorthands.padding(spacing.sm, spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(spacing.sm),
    fontSize: tokens.fontSizeBase300,
    marginBottom: '2px',
    transition: 'all 0.15s ease',
    ...shorthands.border('1px', 'solid', 'transparent'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    },
  },
  treeItemSelected: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
  treeItemNested: {
    marginLeft: spacing.xl,
  },
  treeItemNested2: {
    marginLeft: '48px',
  },
  detailsPane: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    ...shorthands.padding(spacing.xl),
    backgroundColor: tokens.colorNeutralBackground2,
    minWidth: 0,
    '@media (max-width: 768px)': {
      ...shorthands.padding(spacing.md),
    },
    '::-webkit-scrollbar': { width: '8px' },
    '::-webkit-scrollbar-track': { backgroundColor: tokens.colorNeutralBackground1 },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStroke1,
      ...shorthands.borderRadius('4px'),
      ':hover': { backgroundColor: tokens.colorNeutralStroke2 },
    },
  },
  detailsCard: {
    marginBottom: spacing.lg,
    boxShadow: tokens.shadow8,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  propertiesTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: spacing.sm,
    fontSize: tokens.fontSizeBase300,
    tableLayout: 'fixed',
    '@media (max-width: 768px)': { fontSize: tokens.fontSizeBase200 },
  },
  propertyRow: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  propertyLabel: {
    ...shorthands.padding(spacing.md),
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    width: '180px',
    verticalAlign: 'top',
    '@media (max-width: 768px)': {
      width: '120px',
      ...shorthands.padding(spacing.sm),
    },
  },
  propertyValue: {
    ...shorthands.padding(spacing.md),
    color: tokens.colorNeutralForeground1,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    '@media (max-width: 768px)': {
      ...shorthands.padding(spacing.sm),
    },
  },
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding(spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontSize: tokens.fontSizeBase200,
    fontFamily: tokens.fontFamilyMonospace,
    overflowX: 'auto',
    maxHeight: '500px',
    overflowY: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  actionBar: {
    display: 'flex',
    ...shorthands.gap(spacing.sm),
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('64px', spacing.xl),
    color: tokens.colorNeutralForeground3,
  },
  messageContainer: {
    ...shorthands.padding(spacing.lg, spacing.xl),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
  dropdownListbox: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `2px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow16,
  },
});

type SelectedItem =
  | { type: 'header-control'; control: FormControl; path: string[] }
  | { type: 'tab'; tab: FormTab; path: string[] }
  | { type: 'section'; tab: FormTab; section: FormSection; path: string[] }
  | { type: 'control'; tab: FormTab; section: FormSection; control: FormControl; path: string[] }
  | { type: 'footer-control'; control: FormControl; path: string[] }
  | null;

export default function FormReportPage(): JSX.Element {
  const styles = useStyles();
  const { mode, toggleTheme } = useTheme();
  const { clientUrl, entity: entityFromUrl, formId: formIdFromUrl, apiVersion } = useOrgContext();

  // Hook state
  const { state, load, loadedFormId, reset } = useFormStructure();
  const { structure, loading, error } = state;

  // Capture initial selection once (supports "sometimes passed, sometimes not")
  const initialSelectionRef = useRef<{ entity: string | null; formId: string | null }>({
    entity: entityFromUrl || null,
    formId: formIdFromUrl || null,
  });
  const appliedInitialEntityRef = useRef(false);
  const appliedInitialFormRef = useRef(false);

  // Local selection state (source of truth)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // Entity list state
  const [availableEntities, setAvailableEntities] = useState<EntitySummary[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);
  const [entityDropdownValue, setEntityDropdownValue] = useState('');

  // Forms list state
  const [availableForms, setAvailableForms] = useState<SystemForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);

  // Tree/UI state
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Structure editing state
  const [editedStructure, setEditedStructure] = useState(structure);
  const [showRawXml, setShowRawXml] = useState(false);

  useEffect(() => {
    document.title = 'Form Structure - D365 Translator';
  }, []);

  // Derived: structure belongs to the currently selected form
  const structureIsForSelectedForm = !!selectedFormId && loadedFormId === selectedFormId;

  // Sync editedStructure when (new) structure arrives
  useEffect(() => {
    if (structureIsForSelectedForm && structure) {
      setEditedStructure(deepClone(structure));
    }
  }, [structure, structureIsForSelectedForm]);

  // Load entities
  useEffect(() => {
    if (!clientUrl) {
      setAvailableEntities([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingEntities(true);
        setEntitiesError(null);
        const entities = await listAllEntities(clientUrl, apiVersion);

        if (cancelled) return;
        setAvailableEntities(entities);

        // Apply initial entity only if it was provided (no auto-open otherwise)
        if (!appliedInitialEntityRef.current) {
          appliedInitialEntityRef.current = true;
          const initialEntity = initialSelectionRef.current.entity;
          if (initialEntity && entities.some(e => e.LogicalName === initialEntity)) {
            setSelectedEntity(initialEntity);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setEntitiesError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoadingEntities(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientUrl, apiVersion]);

  // Load forms for selected entity
  useEffect(() => {
    if (!clientUrl || !selectedEntity) {
      setAvailableForms([]);
      setSelectedFormId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingForms(true);
        setFormsError(null);
        setAvailableForms([]);
        setSelectedFormId(null);

        const forms = await getFormsForEntity(clientUrl, selectedEntity, apiVersion);

        if (cancelled) return;
        setAvailableForms(forms);

        // Apply initial form only if it was provided (and only once)
        if (!appliedInitialFormRef.current) {
          appliedInitialFormRef.current = true;
          const initialFormId = initialSelectionRef.current.formId;
          if (initialFormId && forms.some(f => f.formid === initialFormId)) {
            setSelectedFormId(initialFormId);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setFormsError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoadingForms(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientUrl, selectedEntity, apiVersion]);

  // Load structure when selected form changes (deduped by loadedFormId)
  useEffect(() => {
    if (!clientUrl || !selectedFormId) return;
    if (loadedFormId === selectedFormId) return;

    load(clientUrl, selectedFormId);
  }, [clientUrl, selectedFormId, loadedFormId, load]);

  const selectedForm = useMemo(() => {
    return availableForms.find(f => f.formid === selectedFormId);
  }, [availableForms, selectedFormId]);

  const formIsCustomizable = useMemo(() => {
    return isFormCustomizable(selectedForm);
  }, [selectedForm]);

  // Handlers (reset structure immediately to avoid flicker/stale UI)
  const handleEntityChange = useCallback(
    (_: unknown, data: { optionValue?: unknown }) => {
      const newEntity = String(data.optionValue || '');

      // User interaction means: no more initial form application
      appliedInitialFormRef.current = true;
      initialSelectionRef.current.formId = null;

      reset();
      setEditedStructure(null);
      setSelectedItem(null);
      setExpandedTabs(new Set());
      setExpandedSections(new Set());
      setSearchQuery('');

      setSelectedEntity(newEntity || null);
      setSelectedFormId(null);
      setAvailableForms([]);

      setEntityDropdownValue('');

      replaceHashQuery({ entity: newEntity || null, formId: null });
    },
    [reset]
  );

  const handleFormChange = useCallback(
    (_: unknown, data: { optionValue?: unknown }) => {
      const newFormId = String(data.optionValue || '');

      reset();
      setEditedStructure(null);
      setSelectedItem(null);
      setExpandedTabs(new Set());
      setExpandedSections(new Set());
      setSearchQuery('');

      setSelectedFormId(newFormId || null);

      replaceHashQuery({ entity: selectedEntity, formId: newFormId || null });
    },
    [reset, selectedEntity]
  );

  const filteredEntities = useMemo(() => {
    if (!entityDropdownValue.trim()) return availableEntities;
    const query = entityDropdownValue.toLowerCase();
    return availableEntities.filter(e => {
      const displayName = getEntityDisplayName(e).toLowerCase();
      const logicalName = e.LogicalName.toLowerCase();
      return displayName.includes(query) || logicalName.includes(query);
    });
  }, [availableEntities, entityDropdownValue]);

  // Group forms by type
  const groupedForms = useMemo(() => {
    const groups = new Map<number, SystemForm[]>();

    availableForms.forEach(form => {
      const existing = groups.get(form.type) || [];
      existing.push(form);
      groups.set(form.type, existing);
    });

    // Sort groups by type number
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [availableForms]);

  const filteredStructure = useMemo(() => {
    const baseStructure = structureIsForSelectedForm ? (editedStructure || structure) : null;
    if (!baseStructure || !searchQuery.trim()) return baseStructure;

    const query = searchQuery.toLowerCase();

    // Filter header controls
    const matchedHeaderControls = baseStructure.header?.controls.filter(control => {
      const controlLabel = getDisplayLabel(control.labels);
      return (
        controlLabel.toLowerCase().includes(query) ||
        control.name?.toLowerCase().includes(query) ||
        control.datafieldname?.toLowerCase().includes(query)
      );
    });

    // Filter tabs
    const matchedTabs: FormTab[] = [];
    for (const tab of baseStructure.tabs) {
      const tabLabel = getDisplayLabel(tab.labels);
      const tabMatches = tabLabel.toLowerCase().includes(query) || tab.name?.toLowerCase().includes(query);

      const matchedColumns = tab.columns.map(col => {
        const matchedSections = col.sections.filter(section => {
          const sectionLabel = getDisplayLabel(section.labels);
          const sectionMatches =
            sectionLabel.toLowerCase().includes(query) || section.name?.toLowerCase().includes(query);

          const controlMatches = section.controls.some(control => {
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

      if (tabMatches || matchedColumns.some(c => c.sections.length > 0)) {
        matchedTabs.push({ ...tab, columns: matchedColumns });
      }
    }

    // Filter footer controls
    const matchedFooterControls = baseStructure.footer?.controls.filter(control => {
      const controlLabel = getDisplayLabel(control.labels);
      return (
        controlLabel.toLowerCase().includes(query) ||
        control.name?.toLowerCase().includes(query) ||
        control.datafieldname?.toLowerCase().includes(query)
      );
    });

    return {
      ...baseStructure,
      header: matchedHeaderControls && matchedHeaderControls.length > 0 ? { controls: matchedHeaderControls } : undefined,
      tabs: matchedTabs,
      footer: matchedFooterControls && matchedFooterControls.length > 0 ? { controls: matchedFooterControls } : undefined,
    };
  }, [structure, editedStructure, searchQuery, structureIsForSelectedForm]);

  useEffect(() => {
    if (!filteredStructure || !searchQuery.trim()) return;

    const newExpandedTabs = new Set<string>();
    const newExpandedSections = new Set<string>();

    for (const tab of filteredStructure.tabs) {
      if (tab.columns.some(c => c.sections.length > 0)) {
        newExpandedTabs.add(tab.id);
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

  const handleExpandAll = useCallback(() => {
    if (!filteredStructure) return;
    setExpandedTabs(new Set(filteredStructure.tabs.map(t => t.id)));
    setExpandedSections(
      new Set(filteredStructure.tabs.flatMap(t => t.columns.flatMap(c => c.sections.map(s => `${t.id}-${s.id}`))))
    );
  }, [filteredStructure]);

  const handleCollapseAll = useCallback(() => {
    setExpandedTabs(new Set());
    setExpandedSections(new Set());
  }, []);

  const toggleTab = useCallback((tabId: string) => {
    setExpandedTabs(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  }, []);

  const toggleSection = useCallback((tabId: string, sectionId: string) => {
    const key = `${tabId}-${sectionId}`;
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleCopyPath = useCallback(() => {
    if (!selectedItem) return;
    const pathString = buildPath(selectedItem.path);
    navigator.clipboard.writeText(pathString).then(() => {
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [selectedItem]);

  const handleSave = useCallback(async () => {
    if (!clientUrl || !selectedEntity || !selectedFormId || !editedStructure) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setSaveStatus(null);

    try {
      await saveFormStructure(clientUrl, selectedFormId, editedStructure, status => setSaveStatus(status));
      setSaveStatus('Publishing...');
      await publishEntityViaWebApi(clientUrl, selectedEntity);

      setSaveStatus(null);
      setSaveSuccess(true);

      // Reload from server after save
      load(clientUrl, selectedFormId);

      window.setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save form structure');
      setSaveStatus(null);
    } finally {
      setIsSaving(false);
    }
  }, [clientUrl, selectedEntity, selectedFormId, editedStructure, load]);

  const updateLabel = useCallback(
    (
      path: { tabIdx: number; colIdx?: number; secIdx?: number; ctrlIdx?: number },
      lcid: number,
      newValue: string
    ) => {
      if (!editedStructure) return;

      const cloned = deepClone(editedStructure);
      const { tabIdx, colIdx, secIdx, ctrlIdx } = path;

      let labels: Label[] | undefined;

      if (ctrlIdx !== undefined && colIdx !== undefined && secIdx !== undefined) {
        labels = cloned.tabs[tabIdx]?.columns[colIdx]?.sections[secIdx]?.controls[ctrlIdx]?.labels;
      } else if (secIdx !== undefined && colIdx !== undefined) {
        labels = cloned.tabs[tabIdx]?.columns[colIdx]?.sections[secIdx]?.labels;
      } else {
        labels = cloned.tabs[tabIdx]?.labels;
      }

      if (labels) {
        const existing = labels.find(l => l.languageCode === lcid);
        if (existing) existing.label = newValue;
      }

      setEditedStructure(cloned);
    },
    [editedStructure]
  );

  const getCurrentItemData = useCallback(() => {
    if (!selectedItem || !editedStructure) return selectedItem;

    const { type } = selectedItem;

    if (type === 'header-control') {
      const freshControl = editedStructure.header?.controls.find(c => c.id === selectedItem.control.id);
      if (freshControl) return { ...selectedItem, control: freshControl };
    }

    if (type === 'tab') {
      const freshTab = editedStructure.tabs.find(t => t.id === selectedItem.tab.id);
      if (freshTab) return { ...selectedItem, tab: freshTab };
    }

    if (type === 'section') {
      const freshTab = editedStructure.tabs.find(t => t.id === selectedItem.tab.id);
      if (freshTab) {
        for (const col of freshTab.columns) {
          const freshSection = col.sections.find(s => s.id === selectedItem.section.id);
          if (freshSection) return { ...selectedItem, tab: freshTab, section: freshSection };
        }
      }
    }

    if (type === 'control') {
      const freshTab = editedStructure.tabs.find(t => t.id === selectedItem.tab.id);
      if (freshTab) {
        for (const col of freshTab.columns) {
          const freshSection = col.sections.find(s => s.id === selectedItem.section.id);
          if (freshSection) {
            const freshControl = freshSection.controls.find(c => c.id === selectedItem.control.id);
            if (freshControl) return { ...selectedItem, tab: freshTab, section: freshSection, control: freshControl };
          }
        }
      }
    }

    if (type === 'footer-control') {
      const freshControl = editedStructure.footer?.controls.find(c => c.id === selectedItem.control.id);
      if (freshControl) return { ...selectedItem, control: freshControl };
    }

    return selectedItem;
  }, [selectedItem, editedStructure]);

  const problems: string[] = [];
  if (!clientUrl) problems.push('Missing clientUrl parameter.');

  return (
    <main className={styles.page}>
      <PageHeader
        title='Form Structure Viewer'
        subtitle='Manage form translations across all languages'
        icon={<DocumentTable24Regular />}
        connectionInfo={{ clientUrl, apiVersion }}
        actions={
          <>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <Spinner size='tiny' />
                <Caption1>Loading form…</Caption1>
              </div>
            )}

            <Button
              appearance='subtle'
              icon={mode === 'dark' ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
              onClick={toggleTheme}
              title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            />

            <Button
              appearance='primary'
              size='large'
              icon={<Save20Regular />}
              onClick={handleSave}
              disabled={
                isSaving ||
                loading ||
                loadingForms ||
                !structureIsForSelectedForm ||
                !editedStructure ||
                !formIsCustomizable
              }
            >
              {isSaving ? 'Saving...' : 'Save All'}
            </Button>
          </>
        }
      />

      {(saveSuccess || saveError || saveStatus) && (
        <div className={styles.messageContainer}>
          {saveSuccess && (
            <MessageBar intent='success'>
              <MessageBarBody>
                <MessageBarTitle>
                  <CheckmarkCircle20Regular /> Saved & Published Successfully
                </MessageBarTitle>
                Form structure has been updated for all languages and published.
              </MessageBarBody>
            </MessageBar>
          )}

          {saveError && (
            <MessageBar intent='error'>
              <MessageBarBody>
                <MessageBarTitle>
                  <ErrorCircle20Regular /> Save Failed
                </MessageBarTitle>
                {saveError}
              </MessageBarBody>
            </MessageBar>
          )}

          {saveStatus && !saveError && (
            <MessageBar intent='info'>
              <MessageBarBody>
                <MessageBarTitle>
                  <Info20Regular /> Saving
                </MessageBarTitle>
                {saveStatus}
              </MessageBarBody>
            </MessageBar>
          )}
        </div>
      )}

      {selectedFormId && structureIsForSelectedForm && !loading && !loadingForms && !formIsCustomizable && (
        <div className={styles.messageContainer}>
          <MessageBar intent='warning'>
            <MessageBarBody>
              <MessageBarTitle>
                <Warning20Regular /> Form Not Customizable
              </MessageBarTitle>
              This form is marked as non-customizable and cannot be edited. You can view the form structure but cannot
              save changes.
            </MessageBarBody>
          </MessageBar>
        </div>
      )}

      {problems.length > 0 && (
        <div style={{ padding: spacing.xl }}>
          <ErrorBox>{problems.join(' ')}</ErrorBox>
        </div>
      )}

      {error && (
        <div style={{ padding: spacing.xl }}>
          <ErrorBox title='Failed to load form'>{error}</ErrorBox>
        </div>
      )}

      {!problems.length && !error && (
        <div className={styles.content}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitle}>
                <DocumentTable24Regular />
                Form Structure
              </div>

              {/* Entity */}
              {loadingEntities ? (
                <div style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                  <Spinner size='small' label='Loading entities...' />
                </div>
              ) : entitiesError ? (
                <div style={{ marginTop: spacing.sm }}>
                  <ErrorBox>{entitiesError}</ErrorBox>
                </div>
              ) : availableEntities.length > 0 ? (
                <div style={{ marginTop: spacing.sm, position: 'relative', zIndex: 1000 }}>
                  <Combobox
                    placeholder='Search or select an entity...'
                    value={
                      entityDropdownValue ||
                      (availableEntities.find(e => e.LogicalName === selectedEntity)
                        ? getEntityDisplayName(availableEntities.find(e => e.LogicalName === selectedEntity)!)
                        : '')
                    }
                    selectedOptions={selectedEntity ? [selectedEntity] : []}
                    onOptionSelect={handleEntityChange}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => setEntityDropdownValue(e.target.value)}
                    positioning='below-start'
                    listbox={{ className: styles.dropdownListbox }}
                    style={{ width: '100%' }}
                  >
                    {filteredEntities.length > 0 ? (
                      filteredEntities.map(e => (
                        <Option key={e.LogicalName} value={e.LogicalName} text={getEntityDisplayName(e)}>
                          {getEntityDisplayName(e)}
                        </Option>
                      ))
                    ) : (
                      <Option disabled value=''>
                        No entities found
                      </Option>
                    )}
                  </Combobox>
                </div>
              ) : null}

              {/* Form */}
              {selectedEntity && (
                <>
                  {loadingForms ? (
                    <div style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                      <Spinner size='small' label='Loading forms...' />
                    </div>
                  ) : formsError ? (
                    <div style={{ marginTop: spacing.sm }}>
                      <ErrorBox>{formsError}</ErrorBox>
                    </div>
                  ) : availableForms.length > 0 ? (
                    <div style={{ marginTop: spacing.sm, position: 'relative', zIndex: 999 }}>
                      <Dropdown
                        placeholder='Select a form'
                        value={availableForms.find(f => f.formid === selectedFormId)?.name || 'Select a form'}
                        selectedOptions={selectedFormId ? [selectedFormId] : []}
                        onOptionSelect={handleFormChange}
                        positioning={{ position: 'below', align: 'start', flipBoundary: null }}
                        listbox={{ className: styles.dropdownListbox }}
                        style={{ width: '100%' }}
                      >
                        {groupedForms.map(([type, forms]) => (
                          <OptionGroup key={type} label={getFormTypeLabel(type)}>
                            {forms.map(form => (
                              <Option key={form.formid} value={form.formid} text={form.name}>
                                {form.name}
                              </Option>
                            ))}
                          </OptionGroup>
                        ))}
                      </Dropdown>
                    </div>
                  ) : null}
                </>
              )}

              <div className={styles.expandButtons}>
                <Tooltip content='Expand all tabs and sections' relationship='label'>
                  <Button
                    size='small'
                    appearance='subtle'
                    icon={<ChevronDoubleDown20Regular />}
                    onClick={handleExpandAll}
                    disabled={!filteredStructure}
                  >
                    Expand
                  </Button>
                </Tooltip>
                <Tooltip content='Collapse all' relationship='label'>
                  <Button
                    size='small'
                    appearance='subtle'
                    icon={<ChevronDoubleUp20Regular />}
                    onClick={handleCollapseAll}
                    disabled={!filteredStructure}
                  >
                    Collapse
                  </Button>
                </Tooltip>
              </div>

              <Input
                className={styles.searchBox}
                placeholder='Search tabs, sections, fields...'
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                contentBefore={<Search20Regular />}
                size='medium'
                disabled={!structureIsForSelectedForm}
              />
            </div>

            <div className={styles.treeContainer}>
              {!selectedEntity && !loading && (
                <div className={styles.emptyState}>
                  <Caption1>Please select an entity above</Caption1>
                </div>
              )}

              {selectedEntity && !selectedFormId && !loading && (
                <div className={styles.emptyState}>
                  <Caption1>Please select a form above</Caption1>
                </div>
              )}

              {selectedFormId && loading && (
                <div className={styles.emptyState}>
                  <Spinner size='medium' />
                  <Caption1 style={{ marginTop: spacing.md }}>Loading form structure...</Caption1>
                </div>
              )}

              {selectedFormId && structureIsForSelectedForm && !loading && filteredStructure?.tabs.length === 0 && (
                <div className={styles.emptyState}>
                  <Caption1>No tabs found</Caption1>
                </div>
              )}

              {/* Header Section */}
              {selectedFormId &&
                structureIsForSelectedForm &&
                !loading &&
                filteredStructure?.header &&
                filteredStructure.header.controls.length > 0 && (
                  <div>
                    <div
                      className={styles.treeItem}
                      onClick={() => {
                        setExpandedTabs(prev => {
                          const next = new Set(prev);
                          if (next.has('__header__')) next.delete('__header__');
                          else next.add('__header__');
                          return next;
                        });
                      }}
                    >
                      {expandedTabs.has('__header__') ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                      <Text weight='semibold' style={{ flex: 1 }}>
                        Header
                      </Text>
                      <Badge size='small' appearance='filled' color='warning'>
                        Header
                      </Badge>
                    </div>

                    {expandedTabs.has('__header__') &&
                      filteredStructure.header.controls.map(control => {
                        const controlLabel =
                          getDisplayLabel(control.labels) || control.datafieldname || control.name || control.id;

                        return (
                          <div
                            key={`header-${control.id}`}
                            className={`${styles.treeItem} ${styles.treeItemNested} ${
                              selectedItem?.type === 'header-control' && selectedItem.control.id === control.id
                                ? styles.treeItemSelected
                                : ''
                            }`}
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedItem({
                                type: 'header-control',
                                control,
                                path: ['Header', controlLabel],
                              });
                            }}
                          >
                            <Text size={200} style={{ flex: 1 }}>
                              {controlLabel}
                            </Text>
                            {control.datafieldname && (
                              <Badge size='tiny' appearance='outline' color='success'>
                                Field
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

              {/* Tabs */}
              {selectedFormId &&
                structureIsForSelectedForm &&
                !loading &&
                filteredStructure &&
                filteredStructure.tabs.map(tab => {
                  const isTabExpanded = expandedTabs.has(tab.id);
                  const tabLabel = getDisplayLabel(tab.labels) || tab.name || tab.id;

                  return (
                    <div key={tab.id}>
                      <div
                        className={`${styles.treeItem} ${
                          selectedItem?.type === 'tab' && selectedItem.tab.id === tab.id ? styles.treeItemSelected : ''
                        }`}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedItem({ type: 'tab', tab, path: [tabLabel] });
                          toggleTab(tab.id);
                        }}
                      >
                        {isTabExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                        <Text weight='semibold' style={{ flex: 1 }}>
                          {tabLabel}
                        </Text>
                        <Badge size='small' appearance='tint' color='brand'>
                          Tab
                        </Badge>
                      </div>

                      {isTabExpanded &&
                        tab.columns.flatMap(col =>
                          col.sections.map(section => {
                            const sectionKey = `${tab.id}-${section.id}`;
                            const isSectionExpanded = expandedSections.has(sectionKey);
                            const sectionLabel = getDisplayLabel(section.labels) || section.name || section.id;

                            return (
                              <div key={sectionKey}>
                                <div
                                  className={`${styles.treeItem} ${styles.treeItemNested} ${
                                    selectedItem?.type === 'section' && selectedItem.section.id === section.id
                                      ? styles.treeItemSelected
                                      : ''
                                  }`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedItem({
                                      type: 'section',
                                      tab,
                                      section,
                                      path: [tabLabel, sectionLabel],
                                    });
                                    toggleSection(tab.id, section.id);
                                  }}
                                >
                                  {isSectionExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                  <Text style={{ flex: 1 }}>{sectionLabel}</Text>
                                  <Badge size='small' appearance='tint' color='informative'>
                                    Section
                                  </Badge>
                                </div>

                                {isSectionExpanded &&
                                  section.controls.map(control => {
                                    const controlLabel =
                                      getDisplayLabel(control.labels) ||
                                      control.datafieldname ||
                                      control.name ||
                                      control.id;

                                    return (
                                      <div
                                        key={control.id}
                                        className={`${styles.treeItem} ${styles.treeItemNested2} ${
                                          selectedItem?.type === 'control' && selectedItem.control.id === control.id
                                            ? styles.treeItemSelected
                                            : ''
                                        }`}
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedItem({
                                            type: 'control',
                                            tab,
                                            section,
                                            control,
                                            path: [tabLabel, sectionLabel, controlLabel],
                                          });
                                        }}
                                      >
                                        <Text size={200} style={{ flex: 1 }}>
                                          {controlLabel}
                                        </Text>
                                        {control.datafieldname && (
                                          <Badge size='tiny' appearance='outline' color='success'>
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

              {/* Footer Section */}
              {selectedFormId &&
                structureIsForSelectedForm &&
                !loading &&
                filteredStructure?.footer &&
                filteredStructure.footer.controls.length > 0 && (
                  <div>
                    <div
                      className={styles.treeItem}
                      onClick={() => {
                        setExpandedTabs(prev => {
                          const next = new Set(prev);
                          if (next.has('__footer__')) next.delete('__footer__');
                          else next.add('__footer__');
                          return next;
                        });
                      }}
                    >
                      {expandedTabs.has('__footer__') ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                      <Text weight='semibold' style={{ flex: 1 }}>
                        Footer
                      </Text>
                      <Badge size='small' appearance='filled' color='severe'>
                        Footer
                      </Badge>
                    </div>

                    {expandedTabs.has('__footer__') &&
                      filteredStructure.footer.controls.map(control => {
                        const controlLabel =
                          getDisplayLabel(control.labels) || control.datafieldname || control.name || control.id;

                        return (
                          <div
                            key={`footer-${control.id}`}
                            className={`${styles.treeItem} ${styles.treeItemNested} ${
                              selectedItem?.type === 'footer-control' && selectedItem.control.id === control.id
                                ? styles.treeItemSelected
                                : ''
                            }`}
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedItem({
                                type: 'footer-control',
                                control,
                                path: ['Footer', controlLabel],
                              });
                            }}
                          >
                            <Text size={200} style={{ flex: 1 }}>
                              {controlLabel}
                            </Text>
                            {control.datafieldname && (
                              <Badge size='tiny' appearance='outline' color='success'>
                                Field
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
            </div>
          </aside>

          {/* Details */}
          <section className={styles.detailsPane}>
            {!selectedEntity && !loading && (
              <div className={styles.emptyState}>
                <DocumentTable24Regular style={{ fontSize: '48px', marginBottom: spacing.md }} />
                <Text size={500} weight='semibold'>
                  No Entity Selected
                </Text>
                <Caption1 style={{ marginTop: spacing.sm }}>Please select an entity from the dropdown to get started</Caption1>
              </div>
            )}

            {selectedEntity && !selectedFormId && !loading && (
              <div className={styles.emptyState}>
                <DocumentTable24Regular style={{ fontSize: '48px', marginBottom: spacing.md }} />
                <Text size={500} weight='semibold'>
                  No Form Selected
                </Text>
                <Caption1 style={{ marginTop: spacing.sm }}>
                  Please select a form from the dropdown to view and edit its structure
                </Caption1>
              </div>
            )}

            {selectedFormId && structureIsForSelectedForm && !selectedItem && !loading && (
              <div className={styles.emptyState}>
                <DocumentTable24Regular style={{ fontSize: '48px', marginBottom: spacing.md }} />
                <Text size={500} weight='semibold'>
                  Select an Item
                </Text>
                <Caption1 style={{ marginTop: spacing.sm }}>
                  Choose a tab, section, or control from the tree to view and edit its details
                </Caption1>
              </div>
            )}

            {selectedItem &&
              structureIsForSelectedForm &&
              (() => {
                const currentItem = getCurrentItemData();
                if (!currentItem) return null;

                return (
                  <>
                    <div className={styles.actionBar}>
                      <Button icon={<Copy20Regular />} onClick={handleCopyPath} appearance='subtle' size='small'>
                        {copySuccess ? '✓ Copied!' : 'Copy Path'}
                      </Button>
                    </div>

                    <Card className={styles.detailsCard}>
                      <CardHeader
                        header={<Text weight='semibold'>Path</Text>}
                        description={<code style={{ fontSize: tokens.fontSizeBase300 }}>{buildPath(currentItem.path)}</code>}
                      />
                    </Card>

                    {currentItem.type === 'header-control' && (
                      <ControlDetails
                        control={currentItem.control}
                        isSaving={isSaving || !structureIsForSelectedForm || !formIsCustomizable}
                        clientUrl={clientUrl}
                        entity={selectedEntity || undefined}
                        formId={selectedFormId || undefined}
                        onUpdateLabel={(lcid, value) => {
                          if (!editedStructure?.header) return;
                          const ctrlIdx = editedStructure.header.controls.findIndex(c => c.id === currentItem.control.id);
                          if (ctrlIdx < 0) return;

                          const cloned = deepClone(editedStructure);
                          if (cloned.header) {
                            const labels = cloned.header.controls[ctrlIdx].labels;
                            const existing = labels.find((l: Label) => l.languageCode === lcid);
                            if (existing) existing.label = value;
                            setEditedStructure(cloned);
                          }
                        }}
                      />
                    )}

                    {currentItem.type === 'tab' && (
                      <TabDetails
                        tab={currentItem.tab}
                        isSaving={isSaving || !structureIsForSelectedForm || !formIsCustomizable}
                        onUpdateLabel={(lcid, value) => {
                          const tabIdx = editedStructure?.tabs.findIndex(t => t.id === currentItem.tab.id) ?? -1;
                          if (tabIdx >= 0) updateLabel({ tabIdx }, lcid, value);
                        }}
                      />
                    )}

                    {currentItem.type === 'section' && (
                      <SectionDetails
                        section={currentItem.section}
                        isSaving={isSaving || !structureIsForSelectedForm || !formIsCustomizable}
                        onUpdateLabel={(lcid, value) => {
                          const tabIdx = editedStructure?.tabs.findIndex(t => t.id === currentItem.tab.id) ?? -1;
                          if (tabIdx < 0) return;

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

                          if (colIdx >= 0 && secIdx >= 0) updateLabel({ tabIdx, colIdx, secIdx }, lcid, value);
                        }}
                      />
                    )}

                    {currentItem.type === 'control' && (
                      <ControlDetails
                        control={currentItem.control}
                        isSaving={isSaving || !structureIsForSelectedForm || !formIsCustomizable}
                        clientUrl={clientUrl}
                        entity={selectedEntity || undefined}
                        formId={selectedFormId || undefined}
                        onUpdateLabel={(lcid, value) => {
                          const tabIdx = editedStructure?.tabs.findIndex(t => t.id === currentItem.tab.id) ?? -1;
                          if (tabIdx < 0) return;

                          const tab = editedStructure!.tabs[tabIdx];
                          let colIdx = -1;
                          let secIdx = -1;
                          let ctrlIdx = -1;

                          tab.columns.forEach((col, ci) => {
                            col.sections.forEach((sec, si) => {
                              if (sec.id === currentItem.section.id) {
                                colIdx = ci;
                                secIdx = si;
                                ctrlIdx = sec.controls.findIndex(c => c.id === currentItem.control.id);
                              }
                            });
                          });

                          if (colIdx >= 0 && secIdx >= 0 && ctrlIdx >= 0) {
                            updateLabel({ tabIdx, colIdx, secIdx, ctrlIdx }, lcid, value);
                          }
                        }}
                      />
                    )}

                    {currentItem.type === 'footer-control' && (
                      <ControlDetails
                        control={currentItem.control}
                        isSaving={isSaving || !structureIsForSelectedForm || !formIsCustomizable}
                        clientUrl={clientUrl}
                        entity={selectedEntity || undefined}
                        formId={selectedFormId || undefined}
                        onUpdateLabel={(lcid, value) => {
                          if (!editedStructure?.footer) return;
                          const ctrlIdx = editedStructure.footer.controls.findIndex(c => c.id === currentItem.control.id);
                          if (ctrlIdx < 0) return;

                          const cloned = deepClone(editedStructure);
                          if (cloned.footer) {
                            const labels = cloned.footer.controls[ctrlIdx].labels;
                            const existing = labels.find((l: Label) => l.languageCode === lcid);
                            if (existing) existing.label = value;
                            setEditedStructure(cloned);
                          }
                        }}
                      />
                    )}

                    {structure?.rawXmlByLcid && (
                      <Card className={styles.detailsCard}>
                        <CardHeader
                          header={<Text weight='semibold'>Debug: Raw Form XML</Text>}
                          description='View the complete form XML retrieved for each provisioned language'
                        />
                        <Divider />
                        <div style={{ padding: '12px' }}>
                          <Button appearance='subtle' onClick={() => setShowRawXml(!showRawXml)}>
                            {showRawXml ? 'Hide Raw XML' : 'Show Raw XML'}
                          </Button>
                        </div>
                        {showRawXml && (
                          <>
                            <Divider />
                            <div style={{ padding: '12px' }}>
                              <Accordion collapsible multiple>
                                {Object.entries(structure.rawXmlByLcid)
                                  .sort(([a], [b]) => Number(a) - Number(b))
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
          </section>
        </div>
      )}
    </main>
  );
}
