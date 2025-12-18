import { useEffect, useState, useMemo } from "react";
import {
  Text,
  makeStyles,
  shorthands,
  tokens,
  Button,
  Input,
  Spinner,
  Badge,
  Card,
  CardHeader,
  Divider,
} from "@fluentui/react-components";
import {
  Database24Regular,
  Code24Regular,
  Search20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  Globe24Regular,
} from "@fluentui/react-icons";

import { ErrorBox, Info } from "../../components/ui/Notice";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import TranslationsTable from "../../components/TranslationsTable";
import CustomButton from "../../components/ui/Button";

import { useOrgContext } from "../../hooks/useOrgContext";
import { useLanguages } from "../../hooks/useLanguages";
import { useSharedStyles, spacing } from "../../styles/theme";
import { useTheme } from "../../context/ThemeContext";
import {
  listGlobalOptionSets,
  getGlobalOptionSet,
  updateGlobalOptionSetLabels,
} from "../../services/optionSetService";
import type { GlobalOptionSetSummary, OptionSetMetadata, Label } from "../../types";
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
});

type EditableOptions = Record<number, Record<number, string>>; // optionValue -> lcid -> label

export default function GlobalOptionSetPage(): JSX.Element {
  const styles = useStyles();
  const sharedStyles = useSharedStyles();
  const { theme, mode, toggleTheme } = useTheme();
  const { clientUrl: clientUrlFromParam, apiVersion: apiVersionFromParam } = useOrgContext();
  
  // Read URL parameters
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const optionSetNameFromUrl = urlParams.get('name');
  
  const { langs, error: langsError } = useLanguages(clientUrlFromParam || "", apiVersionFromParam);

  const [optionSets, setOptionSets] = useState<GlobalOptionSetSummary[]>([]);
  const [selectedOptionSet, setSelectedOptionSet] = useState<string | null>(optionSetNameFromUrl);
  const [selectedMetadata, setSelectedMetadata] = useState<OptionSetMetadata | null>(null);
  const [values, setValues] = useState<EditableOptions>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [usage, setUsage] = useState<OptionSetUsageRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageSearch, setUsageSearch] = useState('');

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

const filteredUsage = useMemo(() => {
  const term = usageSearch.trim().toLowerCase();
  if (!term) return usage;

  return usage.filter((r) =>
    r.entityDisplayName.toLowerCase().includes(term) ||
    r.fieldDisplayName.toLowerCase().includes(term) ||
    r.fieldLogicalName.toLowerCase().includes(term) ||
    r.solutionUniqueName.toLowerCase().includes(term)
  );
}, [usage, usageSearch]);

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

  // Filter option sets by search term
  const filteredOptionSets = useMemo(() => {
    if (!searchTerm) return optionSets;
    const term = searchTerm.toLowerCase();
    return optionSets.filter(
      (os) =>
        os.name.toLowerCase().includes(term) ||
        os.displayName.toLowerCase().includes(term)
    );
  }, [optionSets, searchTerm]);

  if (!clientUrlFromParam) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Global OptionSet Translation Manager"
          subtitle="Manage translations for global option sets"
          icon={<Database24Regular />}
        />
        <div className={styles.content}>
          <ErrorBox>Missing clientUrl in query parameters.</ErrorBox>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
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
        {error && <ErrorBox>Error: {error}</ErrorBox>}
        {info && !error && <Info>{info}</Info>}

        <div className={styles.splitLayout}>
          {/* Sidebar: OptionSet List */}
          <div className={styles.sidebar}>
            <Input
              className={styles.searchBox}
              placeholder="Search option sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              contentBefore={<Search20Regular />}
            />

            <Section title="Global OptionSets" icon={<Database24Regular />}>
              {loading ? (
                <div style={{ textAlign: "center", padding: spacing.lg }}>
                  <Spinner size="medium" label="Loading option sets..." />
                </div>
              ) : filteredOptionSets.length === 0 ? (
                <div className={styles.emptyState}>
                  <Text>No global option sets found.</Text>
                </div>
              ) : (
                <div className={styles.optionSetList}>
                  {filteredOptionSets.map((os) => (
                    <div
                      key={os.name}
                      className={`${styles.optionSetItem} ${
                        selectedOptionSet === os.name ? "selected" : ""
                      }`}
                      onClick={() => setSelectedOptionSet(os.name)}
                    >
                      <div className={styles.optionSetName}>{os.displayName}</div>
                      <div className={styles.optionSetMeta}>
                        <Text size={200}>{os.name}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Main Panel: OptionSet Detail */}
          <div className={styles.detailPanel}>
            {!selectedOptionSet ? (
              <Section title="Select an OptionSet" icon={<Code24Regular />}>
                <div className={styles.emptyState}>
                  <Text>Select a global option set from the list to view and edit its translations.</Text>
                </div>
              </Section>
            ) : loadingDetail ? (
              <Section title="Loading..." icon={<Code24Regular />}>
                <div style={{ textAlign: "center", padding: spacing.xl }}>
                  <Spinner size="large" label="Loading option set details..." />
                </div>
              </Section>
            ) : selectedMetadata ? (
              <Section 
                title={`Translating: ${selectedMetadata.displayName}`}
                icon={<Database24Regular />}
              >
                <Card style={{ padding: spacing.md }}>
                  <CardHeader
                    header={
                      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                        <Text weight="semibold">{selectedMetadata.displayName}</Text>
                        <Badge color="informative" appearance="filled">
                          Global OptionSet
                        </Badge>
                        <Badge appearance="outline">
                          {selectedMetadata.options.length} {selectedMetadata.options.length === 1 ? "option" : "options"}
                        </Badge>
                      </div>
                    }
                    description={
                      <Text size={200}>
                        Logical Name: <code>{selectedMetadata.name}</code>
                      </Text>
                    }
                  />

                  <Divider style={{ margin: `${spacing.md} 0` }} />

                  {selectedMetadata.options.length === 0 ? (
                    <Text>No options defined for this option set.</Text>
                  ) : (
                    <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                      {selectedMetadata.options.map((option) => (
                        <div key={option.value} className={styles.optionRow}>
                          <div className={styles.optionHeader}>
                            <Text className={styles.optionValueNumber}>{option.value}</Text>
                            <Text className={styles.optionValue}>
                              {option.labels.find((l) => l.languageCode === langs?.[0])?.label || 
                                option.labels[0]?.label || "N/A"}
                            </Text>
                          </div>

                          <TranslationsTable
                            lcids={lcids}
                            values={values[option.value] || {}}
                            loading={false}
                            disabled={!langs || !langs.length}
                            placeholder="(empty)"
                            onChange={(lcid, v) => onChange(option.value, lcid, v)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.actions}>
                    <CustomButton
                      onClick={onSave}
                      disabled={saving || !langs?.length}
                      variant="primary"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </CustomButton>
                  </div>
                </Card>
              </Section>
            ) : null}
          </div>
          {/* Usage Panel: OptionSet Usage */}
          <div className={styles.usagePanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Input
                  placeholder="Search fields/entities..."
                  value={usageSearch}
                  onChange={(e) => setUsageSearch(e.target.value)}
                  contentBefore={<Search20Regular />}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Badge appearance="outline" style={{ marginLeft: spacing.md }}>{usage.length} total</Badge>
              </div>

            <Section title="Used by Fields" icon={<Database24Regular />}>
            {usageError && <ErrorBox>{usageError}</ErrorBox>}
              {usageLoading ? (
                <div style={{ textAlign: "center", padding: spacing.lg }}>
                  <Spinner size="medium" label="Loading dependencies..." />
                </div>
              ) : filteredUsage.length === 0 ? (
                <div className={styles.emptyState}>
                  <Text>No fields found using this global option set.</Text>
                </div>
              ) : (
                <div className={styles.optionSetList}>
                  {filteredUsage.map((r) => (
                    <div
                      key={r.fieldLogicalName}
                      className={`${styles.usageItem}`}
                    >
                      <div className={styles.optionSetName}>{r.fieldLogicalName}</div>
                      <div className={styles.optionSetMeta}>
                        <Text size={200}>{r.entityDisplayName}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
