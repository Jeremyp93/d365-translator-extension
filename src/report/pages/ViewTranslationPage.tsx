import { useEffect, useMemo, useState } from "react";
import {
  makeStyles,
  tokens,
  Button,
  Switch,
} from "@fluentui/react-components";
import {
  Grid24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from "@fluentui/react-icons";

import { ErrorBox } from "../../components/ui/Notice";
import { EditingBlockedBanner } from "../../components/ui/EditingBlockedBanner";
import PageHeader from "../../components/ui/PageHeader";
import ListSelector from "../../components/ListSelector";
import ViewLabelEditor from "../../components/view-translation/ViewLabelEditor";

import { useOrgContext } from "../../hooks/useOrgContext";
import { useLanguages } from "../../hooks/useLanguages";
import { useEditingPermission } from "../../hooks/useEditingPermission";
import { useEntityBrowser } from "../../hooks/useEntityBrowser";
import { useSystemViews } from "../../hooks/useSystemViews";
import { useViewTranslations } from "../../hooks/useViewTranslations";
import { getEntityDisplayName } from "../../services/entityMetadataService";
import { queryTypeLabel, PUBLIC_VIEW_QUERY_TYPE } from "../../services/savedQueryService";
import { spacing } from "../../styles/theme";
import { useTheme } from "../../context/ThemeContext";

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
    padding: spacing.xl,
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    "@media (max-width: 768px)": {
      padding: spacing.md,
    },
  },
  splitLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 320px) minmax(0, 1fr)",
    gridTemplateAreas: `"sidebar detail"`,
    gap: spacing.lg,
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      gridTemplateAreas: `
        "sidebar"
        "detail"
      `,
    },
  },
  sidebar: {
    gridArea: "sidebar",
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },
  detailPanel: {
    gridArea: "detail",
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
    minWidth: 0,
    overflow: "hidden",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    padding: `0 ${spacing.sm}`,
  },
});

export default function ViewTranslationPage(): JSX.Element {
  const styles = useStyles();
  const { mode, toggleTheme } = useTheme();
  const { clientUrl, apiVersion } = useOrgContext();

  const { langs } = useLanguages(clientUrl ?? "", apiVersion);
  const lcids = useMemo(() => (langs ?? []).slice().sort((a, b) => a - b), [langs]);
  const { isEditingBlocked } = useEditingPermission(clientUrl ?? "", apiVersion);

  const { entities, loading: entitiesLoading } = useEntityBrowser(clientUrl ?? "", apiVersion);
  const [entity, setEntity] = useState<string | null>(null);

  const { views, loading: viewsLoading, error: viewsError } = useSystemViews(
    clientUrl ?? "",
    entity,
    apiVersion
  );

  const [publicOnly, setPublicOnly] = useState(true);
  const shownViews = useMemo(
    () => (publicOnly ? views.filter((v) => v.queryType === PUBLIC_VIEW_QUERY_TYPE) : views),
    [views, publicOnly]
  );

  const [savedQueryId, setSavedQueryId] = useState<string | null>(null);
  const selectedView = useMemo(
    () => views.find((v) => v.savedQueryId === savedQueryId) ?? null,
    [views, savedQueryId]
  );

  const tx = useViewTranslations(clientUrl ?? "", entity ?? "", savedQueryId, langs ?? undefined, apiVersion);

  useEffect(() => {
    tx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedQueryId, entity]);

  useEffect(() => {
    if (savedQueryId) tx.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedQueryId, langs]);

  useEffect(() => {
    document.title = "View Translations - D365 Translator";
  }, []);

  if (!clientUrl) {
    return (
      <main className={styles.page}>
        <PageHeader
          title="View Translation Manager"
          subtitle="Translate system view names and descriptions"
          icon={<Grid24Regular />}
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
        title="View Translation Manager"
        subtitle="Translate system view names and descriptions"
        icon={<Grid24Regular />}
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
        <EditingBlockedBanner visible={isEditingBlocked} />

        {viewsError && <ErrorBox>Error: {viewsError}</ErrorBox>}
        {tx.error && <ErrorBox>Error: {tx.error}</ErrorBox>}
        {tx.saveError && <ErrorBox>Save failed: {tx.saveError}</ErrorBox>}

        <div className={styles.splitLayout}>
          <aside className={styles.sidebar}>
            <ListSelector
              items={entities}
              title="Entities"
              searchPlaceholder="Search entities..."
              selectedItem={entity}
              onSelectItem={(k) => {
                setEntity(k);
                setSavedQueryId(null);
              }}
              loading={entitiesLoading}
              getItemKey={(e) => e.LogicalName}
              getDisplayName={getEntityDisplayName}
              getMetaText={(e) => e.LogicalName}
            />

            <div className={styles.toggleRow}>
              <Switch
                checked={publicOnly}
                onChange={(_, data) => setPublicOnly(data.checked)}
                label="Public views only"
              />
            </div>

            <ListSelector
              items={shownViews}
              title="Views"
              searchPlaceholder="Search views..."
              selectedItem={savedQueryId}
              onSelectItem={setSavedQueryId}
              loading={viewsLoading}
              getItemKey={(v) => v.savedQueryId}
              getDisplayName={(v) => v.name}
              getMetaText={(v) => queryTypeLabel(v.queryType)}
            />
          </aside>

          <section className={styles.detailPanel}>
            <ViewLabelEditor
              view={selectedView}
              lcids={lcids}
              langs={langs ?? null}
              loading={tx.loading}
              values={tx.values}
              onChange={tx.onChange}
              onSave={tx.save}
              saving={tx.saving}
              hasChanges={tx.hasChanges}
              readOnly={isEditingBlocked}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
