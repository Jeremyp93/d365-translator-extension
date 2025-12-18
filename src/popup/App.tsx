import * as React from "react";
import {
  FluentProvider,
  Text,
  Badge,
  makeStyles,
  shorthands,
  tokens,
  Button,
  Divider,
  TabList,
  Tab,
} from "@fluentui/react-components";
import {
  PaintBrush24Regular,
  EyeOff24Regular,
  Eye24Regular,
  ArrowClockwise24Regular,
  DocumentTable24Regular,
  Sparkle24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  Home20Regular,
  Settings20Regular,
  Database24Regular,
  Grid24Regular,
} from "@fluentui/react-icons";
import { useSharedStyles, spacing } from "../styles/theme";
import { useTheme } from "../context/ThemeContext";

const useStyles = makeStyles({
  popup: {
    width: "360px",
    minHeight: "500px",
    maxHeight: "600px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
    position: "relative",
  },
  header: {
    ...shorthands.padding(spacing.lg),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.md),
    boxShadow: tokens.shadow8,
  },
  headerIcon: {
    fontSize: "32px",
    display: "flex",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundOnBrand,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForegroundOnBrand,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
  },
  contentWrapper: {
    ...shorthands.padding(spacing.lg),
    ...shorthands.gap(spacing.md),
    display: "flex",
    flexDirection: "column",
  },
  stickyspacer: {
    height: "8px",
    flexShrink: 0,
  },
  statusCard: {
    ...shorthands.padding(spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.md),
  },
  section: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.sm),
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: spacing.xs,
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.sm),
  },
  actionButton: {
    justifyContent: "flex-start",
    height: "48px",
    ...shorthands.padding(spacing.md),
  },
  tooltipArea: {
    position: "sticky",
    bottom: "52px",
    minHeight: "48px",
    ...shorthands.padding(spacing.md),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    display: "flex",
    alignItems: "center",
    boxShadow: tokens.shadow8,
    zIndex: 999,
  },
  tooltipText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    lineHeight: "1.4",
  },
  message: {
    ...shorthands.padding(spacing.sm, spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontSize: tokens.fontSizeBase200,
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.xs),
  },
  errorMessage: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.border("1px", "solid", tokens.colorPaletteRedBorder2),
  },
  infoMessage: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
  },
  warningMessage: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteYellowForeground2,
    ...shorthands.border("1px", "solid", tokens.colorPaletteYellowBorder2),
  },
  tabMenu: {
    position: "sticky",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopWidth: "2px",
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke1,
    boxShadow: tokens.shadow16,
    display: "flex",
    ...shorthands.padding(spacing.sm, 0),
    zIndex: 1000,
    "& .fui-TabList": {
      width: "100%",
      display: "flex",
    },
    "& .fui-Tab": {
      flex: 1,
      justifyContent: "center",
    },
  },
  tabContent: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
  },
});

/**
 * Hook to encapsulate your Chrome scripting controller interactions.
 * Keeps your original logic but groups it nicely.
 */
function useD365Controller() {
  const frameIdRef = React.useRef<number | null>(null);
  const tabIdRef = React.useRef<number | null>(null);
  const [active, setActive] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isValidContext, setIsValidContext] = React.useState<boolean>(true);
  const [isDynamicsEnv, setIsDynamicsEnv] = React.useState<boolean>(true);
  const [contextChecking, setContextChecking] = React.useState<boolean>(true);

  // Check if we're on a valid Dynamics 365 form page
  React.useEffect(() => {
    const checkContext = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        
        if (!tab?.url) {
          setIsValidContext(false);
          setIsDynamicsEnv(false);
          setContextChecking(false);
          return;
        }

        // Check if URL is a Dynamics 365 domain and contains form indicators
        const url = new URL(tab.url);
        const isDynamicsDomain = url.hostname.includes('.dynamics.com');
        const isFormPage = url.pathname.includes('/main.aspx') && 
                          url.searchParams.get('pagetype') === 'entityrecord';

        setIsDynamicsEnv(isDynamicsDomain);
        setIsValidContext(isDynamicsDomain && isFormPage);
        setContextChecking(false);
      } catch (e) {
        console.error("Failed to check context:", e);
        setIsValidContext(false);
        setIsDynamicsEnv(false);
        setContextChecking(false);
      }
    };
    checkContext();
  }, []);

  // On mount, probe the controller in the page for real highlight state and sync popup state
  React.useEffect(() => {
    const syncState = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) return;

        // Try to find the frame with Xrm
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          world: "MAIN",
          func: () => Boolean((window as any).Xrm),
        });
        const hit = results.find((r) => r.result === true);
        const frameId = hit?.frameId;
        if (frameId == null) return;

        // Probe the controller for highlight state
        const ctlProbe = await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [frameId] },
          world: "MAIN",
          func: () => Boolean((window as any).__d365Ctl?.enabled),
        });
        const isActive = ctlProbe[0]?.result === true;

        setActive(isActive);
        const storageKey = `highlightActive_${tab.id}`;
        if (isActive) {
          await chrome.storage.session.set({ [storageKey]: true });
        } else {
          await chrome.storage.session.remove(storageKey);
        }
      } catch (e) {
        console.error("Failed to sync highlight state:", e);
      }
    };
    syncState();
  }, []);

  // Save active state to storage
  const saveActiveState = React.useCallback(async (isActive: boolean) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      const storageKey = `highlightActive_${tab.id}`;
      if (isActive) {
        await chrome.storage.session.set({ [storageKey]: true });
      } else {
        await chrome.storage.session.remove(storageKey);
      }
    } catch (e) {
      console.error("Failed to save highlight state:", e);
    }
  }, []);

  const withGuard = React.useCallback(
    async (fn: (tabId: number, frameId: number) => Promise<void>) => {
      setError(null);
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) throw new Error("No active tab.");
        tabIdRef.current = tab.id;

        // Resolve frame once or re-resolve if missing
        const frameId = frameIdRef.current ?? (await findFormFrameId(tab.id));
        if (frameId == null)
          throw new Error("No frame with window.Xrm found on this tab.");
        frameIdRef.current = frameId;

        await ensureController(tab.id, frameId); // make sure controller is there
        await fn(tab.id, frameId);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    },
    []
  );

  const findFormFrameId = async (tabId: number): Promise<number | null> => {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: "MAIN",
      func: () => Boolean((window as unknown as Record<string, unknown>).Xrm),
    });
    const hit = results.find((r) => r.result === true);
    return hit?.frameId ?? null;
  };

  const ensureController = async (
    tabId: number,
    frameId: number
  ): Promise<void> => {
    const probe = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: "MAIN",
      func: () => Boolean((window as any).__d365Ctl),
    });
    // inject relay (content world) once
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      files: ["assets/relay.js"], // content/world script
    });
    if (!probe[0]?.result) {
      await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: "MAIN",
        files: ["assets/pageController.js"],
      });
    }
  };

  const insertHighlightCss = async (
    tabId: number,
    frameId: number
  ): Promise<void> => {
    await chrome.scripting.insertCSS({
      target: { tabId, frameIds: [frameId] },
      files: ["assets/highlight.css"],
      origin: "USER",
    });
  };
  const removeHighlightCss = async (
    tabId: number,
    frameId: number
  ): Promise<void> => {
    try {
      await chrome.scripting.removeCSS({
        target: { tabId, frameIds: [frameId] },
        files: ["assets/highlight.css"],
        origin: "USER",
      });
    } catch {
      /* ignore */
    }
  };

  const callController = async (
    tabId: number,
    frameId: number,
    method: "enable" | "disable" | "showAllFields" | "openFormReportPage" | "openPluginTraceLogsPage" | "openGlobalOptionSetsPage" | "openEntityBrowserPage"
  ): Promise<void> => {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: "MAIN",
      func: (m: "enable" | "disable" | "showAllFields" | "openFormReportPage" | "openPluginTraceLogsPage" | "openGlobalOptionSetsPage" | "openEntityBrowserPage") => {
        const ctl = (window as any).__d365Ctl as {
          enable: () => void;
          disable: () => void;
          showAllFields: () => void;
          openFormReportPage: () => void;
          openPluginTraceLogsPage: () => void;
          openGlobalOptionSetsPage: () => void;
          openEntityBrowserPage: () => void;
        };
        if (!ctl) throw new Error("controller missing");
        ctl[m]();
      },
      args: [method],
    });
  };

  const activate = async () => {
    setBusy(true);
    setInfo("Highlighting translatable fields…");
    await withGuard(async (tabId, frameId) => {
      await insertHighlightCss(tabId, frameId);
      await callController(tabId, frameId, "enable");
      setActive(true);
      await saveActiveState(true);
      setInfo("Highlight enabled.");
    });
    setBusy(false);
  };

  const deactivate = async () => {
    setBusy(true);
    setInfo("Removing highlight…");
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, "disable");
      await removeHighlightCss(tabId, frameId);
      setActive(false);
      await saveActiveState(false);
      setInfo("Highlight removed.");
    });
    setBusy(false);
  };

  const showAllFields = async () => {
    setBusy(true);
    setInfo("Revealing all hidden fields…");
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, "showAllFields");
      setInfo("All fields are now visible.");
    });
    setBusy(false);
  };

  const openFormReportPage = async (): Promise<void> => {
    setBusy(true);
    setInfo("Opening form translations report page…");
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, "openFormReportPage");
      setInfo("Form report page opened.");
    });
    setBusy(false);
  };

  const openPluginTraceLogsPage = async (): Promise<void> => {
    setBusy(true);
    setInfo("Opening plugin trace logs report page…");
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, "openPluginTraceLogsPage");
      setInfo("Plugin trace logs report page opened.");
    });
    setBusy(false);
  };

  const openGlobalOptionSetsPage = async (): Promise<void> => {
    setBusy(true);
    setInfo("Opening global option sets manager…");
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, "openGlobalOptionSetsPage");
      setInfo("Global option sets page opened.");
    });
    setBusy(false);
  };
  const openEntityBrowserPage = async (): Promise<void> => {
    setBusy(true);
    setInfo("Opening entity browser…");
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, "openEntityBrowserPage");
      setInfo("Entity browser opened.");
    });
    setBusy(false);
  };
  // const openPluginTraceLogsPage = async (): Promise<void> => {
  //   const url = chrome.runtime.getURL('report.html') + '#/plugin-trace-logs';
  //   await chrome.tabs.create({ url });
  // };

  const clearCacheAndHardRefresh = async (): Promise<void> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return;

  const tabId = tab.id;
  const origin = new URL(tab.url).origin;

  try {
    // 1) Clear global HTTP cache (same as DevTools “Empty Cache”)
    await chrome.browsingData.remove({ since: 0 }, { cache: true });

    // 2) Clear site-scoped data for the current origin
    //    (Cache Storage, IndexedDB, localStorage, Service Workers, etc.)
    await chrome.browsingData.remove(
      { since: 0, origins: [origin] },
      {
        cacheStorage: true,
        indexedDB: true,
        localStorage: true,
        serviceWorkers: true,
        webSQL: true
      }
    );

    // 3) Clear per-tab storage inside the page (sessionStorage + any lingering localStorage)
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        try { window.localStorage?.clear?.(); } catch {}
        try { window.sessionStorage?.clear?.(); } catch {}
      }
    });

    // 4) Hard reload bypassing cache
    await chrome.tabs.reload(tabId, { bypassCache: true });
  } catch (e) {
    console.warn("[popup] emptyCacheAndHardReload failed:", e);
  }
}

  return {
    active,
    busy,
    info,
    error,
    activate,
    deactivate,
    showAllFields,
    clearCacheAndHardRefresh,
    openFormReportPage,
    openPluginTraceLogsPage,
    openGlobalOptionSetsPage,
    openEntityBrowserPage,
    isValidContext,
    isDynamicsEnv,
    contextChecking,
    setInfo,
  };
}

export default function App(): JSX.Element {
  const styles = useStyles();
  const sharedStyles = useSharedStyles();
  const { theme, mode, toggleTheme } = useTheme();
  const { active, busy, info, error, activate, deactivate, showAllFields, clearCacheAndHardRefresh, openFormReportPage, openPluginTraceLogsPage, openGlobalOptionSetsPage, openEntityBrowserPage, isValidContext, isDynamicsEnv, contextChecking, setInfo } =
    useD365Controller();

  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"general" | "developer">("general");

  // Load saved tab preference from storage
  React.useEffect(() => {
    chrome.storage.local.get(["popupActiveTab"], (result) => {
      if (result.popupActiveTab) {
        setActiveTab(result.popupActiveTab);
      }
    });
  }, []);

  // Save tab preference when it changes
  const handleTabChange = React.useCallback((_: any, data: any) => {
    const newTab = data.value as "general" | "developer";
    setActiveTab(newTab);
    chrome.storage.local.set({ popupActiveTab: newTab });
  }, []);

  // Auto-dismiss info messages after 3 seconds
  React.useEffect(() => {
    if (info && !error) {
      const timer = setTimeout(() => {
        setInfo(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [info, error, setInfo]);

  const buttonDescriptions: Record<string, string> = {
    showAllFields: "Temporarily reveal all hidden controls and fields on the current form",
    clearCache: "Clear browser cache and perform a hard refresh of the current page",
    highlight: "Highlight all translatable fields on the form. Click any highlighted field to open its translation editor.",
    removeHighlight: "Remove field highlighting and disable the translation overlay",
    formTranslations: "Open the comprehensive form translations editor in a new tab",
    globalOptionSets: "Manage translations for global option sets shared across entities",
    pluginTraceLogs: "View plugin execution trace logs with filtering options",
    entityBrowser: "Browse all entities and attributes with translation capabilities",
  };

  return (
    <FluentProvider theme={theme}>
      <div className={styles.popup}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Sparkle24Regular />
          </div>
          <div className={styles.headerText}>
            <div className={styles.title}>D365 Translator</div>
            <div className={styles.subtitle}>Field & Form Translation Tools</div>
          </div>
          <Button
            appearance="subtle"
            icon={mode === "dark" ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
            onClick={toggleTheme}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{ color: tokens.colorNeutralForegroundOnBrand }}
          />
          <Badge
            appearance={active ? "filled" : "tint"}
            color={active ? "success" : "informative"}
            size="large"
          >
            {active ? "Active" : "Idle"}
          </Badge>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.contentWrapper}>
            {/* Context Warning - General Tab */}
            {!contextChecking && !isValidContext && activeTab === "general" && (
              <div className={`${styles.message} ${styles.warningMessage}`}>
                <Text weight="semibold">⚠️ {isDynamicsEnv ? "Not on a Dynamics 365 Form" : "Not in Dynamics 365"}</Text>
                <Text>
                  {isDynamicsEnv 
                    ? "General tools require a Dynamics 365 form page. Please navigate to a form or switch to the Developer tab."
                    : "This extension requires a Dynamics 365 environment. Please navigate to a Dynamics 365 page."}
                </Text>
              </div>
            )}

            {/* Context Warning - Developer Tab */}
            {!contextChecking && !isDynamicsEnv && activeTab === "developer" && (
              <div className={`${styles.message} ${styles.warningMessage}`}>
                <Text weight="semibold">⚠️ Not in Dynamics 365</Text>
                <Text>Developer tools require a Dynamics 365 environment. Please navigate to a Dynamics 365 page.</Text>
              </div>
            )}

            {/* Status messages */}
            {error && (
              <div className={`${styles.message} ${styles.errorMessage}`}>
                <Text weight="semibold">Error:</Text>
                <Text>{error}</Text>
              </div>
            )}
            
            {info && !error && (
              <div className={`${styles.message} ${styles.infoMessage}`}>
                <Text>{info}</Text>
              </div>
            )}

            {/* General Tab Content */}
            {activeTab === "general" && (
            <div className={styles.tabContent}>
              {/* Quick Actions Section */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Quick Actions</div>
                <div className={styles.buttonGroup}>
                  <Button
                    appearance="secondary"
                    size="large"
                    icon={<Eye24Regular />}
                    onClick={showAllFields}
                    disabled={busy || !isValidContext || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("showAllFields")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Show All Fields
                  </Button>
                </div>
              </div>

              <Divider />

              {/* Translation Tools Section */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Translation Tools</div>
                <div className={styles.buttonGroup}>
                  <Button
                    appearance="primary"
                    size="large"
                    icon={<PaintBrush24Regular />}
                    onClick={activate}
                    disabled={busy || active || !isValidContext || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("highlight")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Highlight Fields
                  </Button>

                  <Button
                    appearance="secondary"
                    size="large"
                    icon={<EyeOff24Regular />}
                    onClick={deactivate}
                    disabled={busy || !active || !isValidContext || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("removeHighlight")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Remove Highlight
                  </Button>

                  <Button
                    appearance="primary"
                    size="large"
                    icon={<DocumentTable24Regular />}
                    onClick={openFormReportPage}
                    disabled={busy || !isValidContext || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("formTranslations")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Form Translations
                  </Button>

                  <Button
                    appearance="secondary"
                    size="large"
                    icon={<Database24Regular />}
                    onClick={openGlobalOptionSetsPage}
                    disabled={busy || !isDynamicsEnv || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("globalOptionSets")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Global OptionSets
                  </Button>
                  <Button
                    appearance="secondary"
                    size="large"
                    icon={<Grid24Regular />}
                    onClick={openEntityBrowserPage}
                    disabled={busy || !isDynamicsEnv || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("entityBrowser")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Entity Browser
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Developer Tab Content */}
          {activeTab === "developer" && (
            <div className={styles.tabContent}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Developer Tools</div>
                <div className={styles.buttonGroup}>
                  <Button
                    appearance="secondary"
                    size="large"
                    icon={<ArrowClockwise24Regular />}
                    onClick={clearCacheAndHardRefresh}
                    disabled={busy || !isDynamicsEnv || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("clearCache")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Clear Cache & Refresh
                  </Button>

                  <Button
                    appearance="primary"
                    size="large"
                    icon={<Sparkle24Regular />}
                    onClick={openPluginTraceLogsPage}
                    disabled={busy || !isDynamicsEnv || contextChecking}
                    className={styles.actionButton}
                    onMouseEnter={() => setHoveredButton("pluginTraceLogs")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    Plugin Trace Logs
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className={styles.stickyspacer} />
          </div>
        </div>

        {/* Sticky Tooltip Area */}
        <div className={styles.tooltipArea}>
          <Text className={styles.tooltipText}>
            {hoveredButton ? buttonDescriptions[hoveredButton] : "Hover over a button to see its description"}
          </Text>
        </div>

        {/* Sticky Tab Menu */}
        <div className={styles.tabMenu}>
          <TabList
            selectedValue={activeTab}
            onTabSelect={handleTabChange}
            size="large"
          >
            <Tab value="general" icon={<Home20Regular />}>
              General
            </Tab>
            <Tab value="developer" icon={<Settings20Regular />}>
              Developer
            </Tab>
          </TabList>
        </div>
      </div>
    </FluentProvider>
  );
}
