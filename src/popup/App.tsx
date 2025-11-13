import React, { useState, useRef } from "react";

export default function App(): JSX.Element {
  const [active, setActive] = useState(false);
  const frameIdRef = useRef<number | null>(null);
  const tabIdRef = useRef<number | null>(null);

  const findFormFrameId = async (tabId: number): Promise<number | null> => {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: "MAIN",
      func: () => Boolean((window as unknown as Record<string, unknown>).Xrm),
    });
    const hit = results.find((r) => r.result === true);
    return hit?.frameId ?? null;
  };

  const addReport = async (tabId: number, frameId: number): Promise<void> => {
    // in popup, AFTER you’ve found frameId:
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      // default world is ISOLATED = content world (what we need)
      files: ['assets/relay.js']
    });
  };

  const ensureController = async (
    tabId: number,
    frameId: number
  ): Promise<void> => {
    const probe = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: "MAIN",
      func: () =>
        Boolean((window as unknown as Record<string, unknown>).__d365Ctl),
    });
    if (!probe[0]?.result) {
      await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: "MAIN",
        files: ["assets/pageController.js"],
      });
      console.log("[popup] controller injected in frame", frameId);
    }
  };

  const insertHighlightCss = async (
    tabId: number,
    frameId: number
  ): Promise<void> => {
    await chrome.scripting.insertCSS({
      target: { tabId, frameIds: [frameId] },
      files: ["assets/highlight.css"],
      origin: "USER", // keeps it separate from page styles
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
    } catch (e) {
      // If CSS wasn't present (e.g., page reloaded), ignore
      console.warn("[popup] removeCSS warning:", e);
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
        const ctl = (
          window as unknown as {
            __d365Ctl?: { enable: () => void; disable: () => void; showAllFields: () => void };
          }
        ).__d365Ctl;
        if (!ctl) throw new Error("controller missing");
        ctl[m]();
      },
      args: [method],
    });
  };

  const activate = async (): Promise<void> => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;
    tabIdRef.current = tab.id;

    // resolve frame once (or re-resolve if missing)
    const frameId = frameIdRef.current ?? (await findFormFrameId(tab.id));
    if (frameId == null) {
      console.warn("[popup] No frame with window.Xrm found on this tab.");
      return;
    }
    frameIdRef.current = frameId;
    await addReport(tab.id, frameId);
    await ensureController(tab.id, frameId);

    const next = !active;

      await insertHighlightCss(tab.id, frameId);
      await callController(tab.id, frameId, "enable");
  };

  const deactivate = async (): Promise<void> => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;
    tabIdRef.current = tab.id;

    // resolve frame once (or re-resolve if missing)
    const frameId = frameIdRef.current ?? (await findFormFrameId(tab.id));
    if (frameId == null) {
      console.warn("[popup] No frame with window.Xrm found on this tab.");
      return;
    }
    frameIdRef.current = frameId;

    await ensureController(tab.id, frameId);

    const next = !active;

      await callController(tab.id, frameId, "disable");
      await removeHighlightCss(tab.id, frameId);
  };

  const showAll = async (): Promise<void> => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;
    tabIdRef.current = tab.id;

    // resolve frame once (or re-resolve if missing)
    const frameId = frameIdRef.current ?? (await findFormFrameId(tab.id));
    if (frameId == null) {
      console.warn("[popup] No frame with window.Xrm found on this tab.");
      return;
    }
    frameIdRef.current = frameId;

    await ensureController(tab.id, frameId);

    await callController(tab.id, frameId, "showAllFields");
  }

  // const toggle = async (): Promise<void> => {
  //   const [tab] = await chrome.tabs.query({
  //     active: true,
  //     currentWindow: true,
  //   });
  //   if (!tab?.id) return;
  //   tabIdRef.current = tab.id;

  //   // resolve frame once (or re-resolve if missing)
  //   const frameId = frameIdRef.current ?? (await findFormFrameId(tab.id));
  //   if (frameId == null) {
  //     console.warn("[popup] No frame with window.Xrm found on this tab.");
  //     return;
  //   }
  //   frameIdRef.current = frameId;

  //   await ensureController(tab.id, frameId);

  //   const next = !active;
  //   setActive(next);

  //   if (next) {
  //     // enabling
  //     await insertHighlightCss(tab.id, frameId);
  //     await callController(tab.id, frameId, "enable");
  //   } else {
  //     // disabling
  //     await callController(tab.id, frameId, "disable");
  //     await removeHighlightCss(tab.id, frameId);
  //   }
  // };

  return (
    <div
      style={{
        padding: 12,
        width: 260,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 8 }}>D365 Field Translator</h3>
      <button
        onClick={showAll}
        style={{ width: "100%", padding: "8px 12px", cursor: "pointer" }}
      >
        Show all fields
      </button>
      <button
        onClick={activate}
        style={{ width: "100%", padding: "8px 12px", cursor: "pointer" }}
      >
        Highlight translatable fields
      </button>
      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
        Click a highlighted field to see the DisplayName translations in all
        languages.
      </p>
      <button
        onClick={deactivate}
        style={{ width: "100%", padding: "8px 12px", cursor: "pointer" }}
      >
        Remove highlight
        </button>
    </div>
  );
}
