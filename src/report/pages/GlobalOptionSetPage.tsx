import { useEffect, useState, useMemo } from "react";
import {
  Text,
  makeStyles,
  shorthands,
  tokens,
  Button,
} from "@fluentui/react-components";
import {
  Database24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  Globe24Regular,
} from "@fluentui/react-icons";

import { ErrorBox, Info } from "../../components/ui/Notice";
import { EditingBlockedBanner } from "../../components/ui/EditingBlockedBanner";
import PageHeader from "../../components/ui/PageHeader";
import ListSelector from "../../components/ListSelector";
import DependencyPanel from "../../components/DependencyPanel";
import OptionSetDetail from "../../components/global-optionset/OptionSetDetail";

import { useOrgContext } from "../../hooks/useOrgContext";
import { useLanguages } from "../../hooks/useLanguages";
import { useEditingPermission } from "../../hooks/useEditingPermission";
import { spacing } from "../../styles/theme";
import { useTheme } from "../../context/ThemeContext";
import {
  listGlobalOptionSets,
  getGlobalOptionSet,
  updateGlobalOptionSetLabels,
} from "../../services/optionSetService";
import type { GlobalOptionSetSummary, OptionSetMetadata } from "../../types";
import { getGlobalOptionSetUsage, OptionSetUsageRow } from "../../services/dependencyService";

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
    gridTemplateColumns: "minmax(200px, 300px) minmax(0, 1fr)",
    gridTemplateAreas: `
      "sidebar detail"
      "usage  usage"
    `,
    ...shorthands.gap(spacing.lg),
    // Large desktops: show all 3 columns side by side
    '@media (min-width: 1600px)': {
      gridTemplateColumns: 'minmax(250px, 400px) minmax(0, 1fr) minmax(250px, 340px)',
      gridTemplateAreas: `"sidebar detail usage"`,
    },
    // Tablets: stack everything
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      gridTemplateAreas: `
        "sidebar"
        "detail"
        "usage"
      `,
    },
  },
  sidebar: {
    gridArea: 'sidebar',
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
  },
  searchBox: {
    width: "100%",
  },
  optionSetList: {
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
  optionSetItem: {
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
  usageItem: {
    ...shorthands.padding(spacing.sm, spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", "transparent"),
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
    },
  },
  optionSetName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    marginBottom: spacing.xs,
    whiteSpace: "nowrap",
    ...shorthands.overflow("hidden"),
    textOverflow: "ellipsis",
  },
  optionSetMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    display: "flex",
    justifyContent: "space-between",
    whiteSpace: "nowrap",
    ...shorthands.overflow("hidden"),
    textOverflow: "ellipsis",
  },
  detailPanel: {
    gridArea: 'detail',
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
    minWidth: 0,
    overflow: "hidden",
  },
  usagePanel: {
    gridArea: 'usage',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  },
  optionRow: {
    marginBottom: "32px",
  },
  optionHeader: {
    display: "flex",
    alignItems: "baseline",
    ...shorthands.gap(spacing.md),
    marginBottom: spacing.md,
  },
  optionValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  optionValueNumber: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  actions: {
    display: "flex",
    ...shorthands.gap(spacing.sm),
    marginTop: spacing.md,
  },
  emptyState: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
    color: tokens.colorNeutralForeground3,
  },
  spinnerContainer: {
    textAlign: "center",
    ...shorthands.padding(spacing.lg),
  },
  spinnerContainerLarge: {
    textAlign: "center",
    ...shorthands.padding(spacing.xl),
  },
  cardPadding: {
    ...shorthands.padding(spacing.md),
  },
  dividerMargin: {
    ...shorthands.margin(spacing.md, 0),
  },
  scrollableContent: {
    maxHeight: "60vh",
    overflowY: "auto",
  },
  flexGapSmall: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  usageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  flexGrow: {
    flex: 1,
    minWidth: 0,
  },
  badgeSpacing: {
    marginLeft: spacing.md,
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
});

type EditableOptions = Record<number, Record<number, string>>; // optionValue -> lcid -> label

export default function GlobalOptionSetPage(): JSX.Element {
  const styles = useStyles();
  const { mode, toggleTheme } = useTheme();
  const { clientUrl: clientUrlFromParam, apiVersion: apiVersionFromParam } = useOrgContext();

  // Check editing permission
  const { isEditingBlocked } = useEditingPermission(clientUrlFromParam || "", apiVersionFromParam);

  // Read URL parameters
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const optionSetNameFromUrl = urlParams.get('name');

  const { langs } = useLanguages(clientUrlFromParam || "", apiVersionFromParam);

  const [optionSets, setOptionSets] = useState<GlobalOptionSetSummary[]>([]);
  const [selectedOptionSet, setSelectedOptionSet] = useState<string | null>(optionSetNameFromUrl);
  const [selectedMetadata, setSelectedMetadata] = useState<OptionSetMetadata | null>(null);
  const [values, setValues] = useState<EditableOptions>({});

  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [usage, setUsage] = useState<OptionSetUsageRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const lcids = useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs]
  );

  // Set document title
  useEffect(() => {
    document.title = 'Global OptionSets - D365 Translator';
  }, []);

  // Load global option sets list
  useEffect(() => {
    if (!clientUrlFromParam) return;
    
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const sets = await listGlobalOptionSets(clientUrlFromParam, apiVersionFromParam);
        if (!cancelled) {
          setOptionSets(sets);
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
  }, [clientUrlFromParam]);

  useEffect(() => {
  if (!clientUrlFromParam || !selectedMetadata?.metadataId) return;

  let cancelled = false;

  (async () => {
    try {
      setUsageError(null);
      setUsageLoading(true);

      const rows = await getGlobalOptionSetUsage(
        clientUrlFromParam,
        selectedMetadata.metadataId,
        apiVersionFromParam ?? 'v9.2',
      );

      if (!cancelled) setUsage(rows);
    } catch (e: any) {
      if (!cancelled) setUsageError(e?.message ?? String(e));
    } finally {
      if (!cancelled) setUsageLoading(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [clientUrlFromParam, apiVersionFromParam, selectedMetadata?.metadataId]);

  // Load selected option set details
  useEffect(() => {
    if (!clientUrlFromParam || !selectedOptionSet) return;
    
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setInfo("Loading option set details…");
        setLoadingDetail(true);
        
        const meta = await getGlobalOptionSet(clientUrlFromParam, selectedOptionSet, apiVersionFromParam);
        
        // Build values map
        const valuesMap: EditableOptions = {};
        meta.options.forEach((opt) => {
          valuesMap[opt.value] = {};
          const allLcids = new Set<number>([
            ...lcids,
            ...opt.labels.map((l) => l.languageCode),
          ]);
          Array.from(allLcids).forEach((lcid) => {
            const hit = opt.labels.find((l) => l.languageCode === lcid);
            valuesMap[opt.value][lcid] = hit?.label ?? "";
          });
        });

        if (!cancelled) {
          setSelectedMetadata(meta);
          setValues(valuesMap);
          setInfo(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [clientUrlFromParam, selectedOptionSet, lcids.join(",")]);

  const onChange = (optionValue: number, lcid: number, v: string) => {
    setValues((prev) => ({
      ...prev,
      [optionValue]: {
        ...(prev[optionValue] || {}),
        [lcid]: v,
      },
    }));
  };

  const onSave = async () => {
    if (!clientUrlFromParam || !selectedOptionSet) return;

    try {
      setSaving(true);
      setError(null);
      setInfo("Saving global option set labels…");

      const editedOptions = Object.keys(values)
        .map(Number)
        .map(optionValue => ({
          value: optionValue,
          labels: Object.keys(values[optionValue])
            .map(Number)
            .map(lcid => ({
              languageCode: lcid,
              label: values[optionValue][lcid] ?? "",
            })),
        }));

      await updateGlobalOptionSetLabels(clientUrlFromParam, selectedOptionSet, editedOptions, apiVersionFromParam);

      setInfo("Saved. Global option set changes are automatically published.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!clientUrlFromParam) {
    return (
      <main className={styles.page}>
        <PageHeader
          title="Global OptionSet Translation Manager"
          subtitle="Manage translations for global option sets"
          icon={<Database24Regular />}
        />
        <div className={styles.content}>
          <ErrorBox>Missing clientUrl in query parameters.</ErrorBox>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <PageHeader
        title="Global OptionSet Translation Manager"
        subtitle="Manage translations for global option sets shared across entities"
        icon={<Globe24Regular />}
        connectionInfo={{ clientUrl: clientUrlFromParam, apiVersion: apiVersionFromParam }}
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
        <EditingBlockedBanner visible={isEditingBlocked} />

        {error && <ErrorBox>Error: {error}</ErrorBox>}
        {info && !error && <Info>{info}</Info>}

        <div className={styles.splitLayout}>
          {/* Sidebar: OptionSet List */}
          <aside className={styles.sidebar}>
            <ListSelector
              items={optionSets}
              title="Global OptionSets"
              searchPlaceholder="Search option sets..."
              selectedItem={selectedOptionSet}
              onSelectItem={setSelectedOptionSet}
              loading={loading}
              getItemKey={(os) => os.name}
              getDisplayName={(os) => os.displayName}
              getMetaText={(os) => os.name}
            />
          </aside>

          {/* Main Panel: OptionSet Detail */}
          <section className={styles.detailPanel}>
            <OptionSetDetail
              selectedOptionSet={selectedOptionSet}
              loadingDetail={loadingDetail}
              selectedMetadata={selectedMetadata}
              lcids={lcids}
              langs={langs}
              values={values}
              onChange={onChange}
              onSave={onSave}
              saving={saving}
              readOnly={isEditingBlocked}
            />
          </section>
          {/* Usage Panel: OptionSet Usage */}
          <aside className={styles.usagePanel}>
            <DependencyPanel
              dependencies={usage}
              loading={usageLoading}
              error={usageError}
              title="Used by Fields"
              searchPlaceholder="Search fields/entities..."
              emptyMessage="No fields found using this global option set."
              getItemKey={(item) => item.fieldLogicalName}
              filterItem={(item, term) =>
                item.entityDisplayName.toLowerCase().includes(term) ||
                item.fieldDisplayName.toLowerCase().includes(term) ||
                item.fieldLogicalName.toLowerCase().includes(term)
              }
              renderItem={(item) => (
                <>
                  <div className={styles.dependencyName}>{item.fieldLogicalName}</div>
                  <div className={styles.entityMeta}>
                    <Text size={200}>{item.entityDisplayName}</Text>
                  </div>
                </>
              )}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
