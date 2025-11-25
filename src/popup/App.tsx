import * as React from "react";
import {
  FluentProvider,
  webDarkTheme,
  Card,
  CardHeader,
  CardPreview,
  //Button,
  Text,
  Divider,
  Caption1,
  Body1,
  Badge,
  makeStyles,
  shorthands,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import Button from "../components/ui/Button";

const useStyles = makeStyles({
  popup: {
    // Typical Chrome popup sizing
    width: "300px",
    ...shorthands.padding("12px"),
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "var(--colorNeutralBackgroundStatic)",
  },
  actions: {
    display: "grid !important",
    gridTemplateColumns: "1fr !important",
    rowGap: "8px !important",
    marginTop: "8px !important",
  },
  footerNote: {
    marginTop: "8px !important",
    color: tokens.colorNeutralForeground3,
    padding: "8px !important",
  },
  row: {
    display: "flex !important",
    alignItems: "center !important",
    gap: "8px !important",
  },
  grow: { flex: 1 },
  error: {
    background: tokens.colorStatusDangerBackground2,
    color: tokens.colorStatusDangerForeground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: '6px 8px !important',
    marginTop: '8px !important',
  },
  info: {
    background: tokens.colorBrandBackground2,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: tokens.borderRadiusMedium,
    padding: '6px 8px !important',
    marginTop: '8px !important',
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
    method: "enable" | "disable" | "showAllFields"
  ): Promise<void> => {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: "MAIN",
      func: (m: "enable" | "disable" | "showAllFields") => {
        const ctl = (window as any).__d365Ctl as {
          enable: () => void;
          disable: () => void;
          showAllFields: () => void;
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

  return {
    active,
    busy,
    info,
    error,
    activate,
    deactivate,
    showAllFields,
  };
}

export default function App(): JSX.Element {
  const styles = useStyles();
  const { active, busy, info, error, activate, deactivate, showAllFields } =
    useD365Controller();

  return (
    <FluentProvider theme={webDarkTheme}>
      <div className={styles.popup}>
        <Card className={styles.card}>
          <CardHeader
            header={<Text weight="semibold">D365 Field Translator</Text>}
            description={
              <div className={styles.row}>
                <Caption1>Control highlighter & quick tools</Caption1>
                <div className={styles.grow} />
                <Badge
                  appearance={active ? "filled" : "tint"}
                  color={active ? "brand" : "informative"}
                >
                  {active ? "Active" : "Idle"}
                </Badge>
              </div>
            }
          />
          <CardPreview>
            <Divider />
            <div className={styles.actions}>
              <Tooltip
                content="Temporarily show all controls/fields on the form"
                relationship="label"
              >
                <Button
                  appearance="secondary"
                  onClick={showAllFields}
                  disabled={busy}
                >
                  Show all fields
                </Button>
              </Tooltip>

              <Divider />
              <Tooltip
                content="Highlight translatable controls. Click a control to open the report."
                relationship="label"
              >
                <Button appearance="primary" onClick={activate} disabled={busy}>
                  Highlight translatable fields
                </Button>
              </Tooltip>

              <Tooltip
                content="Turn off highlight and remove overlay CSS"
                relationship="label"
              >
                <Button
                  appearance="primary"
                  onClick={deactivate}
                  disabled={busy}
                >
                  Remove highlight
                </Button>
              </Tooltip>
            </div>

            {error && (
              <div className={styles.error}>
                <Body1>{error}</Body1>
              </div>
            )}

            <div className={styles.footerNote}>
              <Caption1>
                Tip: click a highlighted control to open the translations report
                page.
              </Caption1>
            </div>
          </CardPreview>
        </Card>
      </div>
    </FluentProvider>
  );
}
