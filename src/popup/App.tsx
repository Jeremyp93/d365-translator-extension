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
} from "@fluentui/react-icons";
import { useSharedStyles, spacing } from "../styles/theme";
import { useTheme } from "../context/ThemeContext";

const useStyles = makeStyles({
  popup: {
    width: "360px",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
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
    ...shorthands.padding(spacing.lg),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
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
    minHeight: "48px",
    ...shorthands.padding(spacing.md),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground3,
    display: "flex",
    alignItems: "center",
  },
  tooltipText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    lineHeight: "1.4",
  },
  footer: {
    ...shorthands.padding(spacing.md, spacing.lg),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  footerText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
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
          setContextChecking(false);
          return;
        }

        // Check if URL is a Dynamics 365 domain and contains form indicators
        const url = new URL(tab.url);
        const isDynamicsDomain = url.hostname.includes('.dynamics.com');
        const isFormPage = url.pathname.includes('/main.aspx') && 
                          url.searchParams.get('pagetype') === 'entityrecord';

        setIsValidContext(isDynamicsDomain && isFormPage);
        setContextChecking(false);
      } catch (e) {
        console.error("Failed to check context:", e);
        setIsValidContext(false);
        setContextChecking(false);
      }
    };
    checkContext();
  }, []);

  // Load active state from storage on mount
  React.useEffect(() => {
    const loadState = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) return;

        const storageKey = `highlightActive_${tab.id}`;
        const result = await chrome.storage.session.get(storageKey);
        if (result[storageKey] === true) {
          setActive(true);
        }
      } catch (e) {
        console.error("Failed to load highlight state:", e);
      }
    };
    loadState();
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
    method: "enable" | "disable" | "showAllFields" | "openFormReportPage"
  ): Promise<void> => {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: "MAIN",
      func: (m: "enable" | "disable" | "showAllFields" | "openFormReportPage") => {
        const ctl = (window as any).__d365Ctl as {
          enable: () => void;
          disable: () => void;
          showAllFields: () => void;
          openFormReportPage: () => void;
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
    isValidContext,
    contextChecking,
    setInfo,
  };
}

export default function App(): JSX.Element {
  const styles = useStyles();
  const sharedStyles = useSharedStyles();
  const { theme, mode, toggleTheme } = useTheme();
  const { active, busy, info, error, activate, deactivate, showAllFields, clearCacheAndHardRefresh, openFormReportPage, isValidContext, contextChecking, setInfo } =
    useD365Controller();

  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

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
          {/* Context Warning */}
          {!contextChecking && !isValidContext && (
            <div className={`${styles.message} ${styles.warningMessage}`}>
              <Text weight="semibold">⚠️ Not on a Dynamics 365 Form</Text>
              <Text>This extension only works on Dynamics 365 form pages. Please navigate to a form to use the translation tools.</Text>
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

              <Button
                appearance="secondary"
                size="large"
                icon={<ArrowClockwise24Regular />}
                onClick={clearCacheAndHardRefresh}
                disabled={busy || !isValidContext || contextChecking}
                className={styles.actionButton}
                onMouseEnter={() => setHoveredButton("clearCache")}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Clear Cache & Refresh
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
            </div>
          </div>

          {/* Fixed Tooltip Area */}
          <div className={styles.tooltipArea}>
            <Text className={styles.tooltipText}>
              {hoveredButton ? buttonDescriptions[hoveredButton] : "Hover over a button to see its description"}
            </Text>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Text className={styles.footerText}>
            💡 <strong>Tip:</strong> After highlighting fields, click any highlighted control to instantly open its translation editor.
          </Text>
        </div>
      </div>
    </FluentProvider>
  );
}
