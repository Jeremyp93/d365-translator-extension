/**
 * Hook to manage D365 page controller interactions
 * Handles highlight state, field visibility, and navigation
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  getActiveTab,
  findXrmFrameId,
  controllerExists,
  getControllerState,
  injectController,
  insertHighlightCss,
  removeHighlightCss,
  callController,
  saveHighlightState,
  clearCacheAndHardRefresh,
} from '../services/chromeTabService';
import type { ControllerMethod } from '../types/chromeExtension';

export function useD365Controller() {
  const frameIdRef = useRef<number | null>(null);
  const tabIdRef = useRef<number | null>(null);

  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize and sync state with page controller
  useEffect(() => {
    const syncState = async () => {
      try {
        const tab = await getActiveTab();
        if (!tab?.id) return;

        const frameId = await findXrmFrameId(tab.id);
        if (frameId == null) return;

        const isActive = await getControllerState(tab.id, frameId);
        setActive(isActive);

        await saveHighlightState(tab.id, isActive);
      } catch (e) {
        console.error('Failed to sync highlight state:', e);
      }
    };
    syncState();
  }, []);

  // Guard wrapper for controller operations
  const withGuard = useCallback(
    async (fn: (tabId: number, frameId: number) => Promise<void>) => {
      setError(null);
      try {
        const tab = await getActiveTab();
        if (!tab?.id) throw new Error('No active tab.');

        tabIdRef.current = tab.id;

        // Resolve or reuse frame ID
        const frameId = frameIdRef.current ?? (await findXrmFrameId(tab.id));
        if (frameId == null) {
          throw new Error('No frame with window.Xrm found on this tab.');
        }
        frameIdRef.current = frameId;

        // Ensure controller is injected
        const exists = await controllerExists(tab.id, frameId);
        if (!exists) {
          await injectController(tab.id, frameId);
        }

        await fn(tab.id, frameId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    []
  );

  // Public actions
  const activate = async () => {
    setBusy(true);
    setInfo('Highlighting translatable fields…');
    await withGuard(async (tabId, frameId) => {
      await insertHighlightCss(tabId, frameId);
      await callController(tabId, frameId, 'enable');
      setActive(true);
      await saveHighlightState(tabId, true);
      setInfo('Highlight enabled.');
    });
    setBusy(false);
  };

  const deactivate = async () => {
    setBusy(true);
    setInfo('Removing highlight…');
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, 'disable');
      await removeHighlightCss(tabId, frameId);
      setActive(false);
      await saveHighlightState(tabId, false);
      setInfo('Highlight removed.');
    });
    setBusy(false);
  };

  const showAllFields = async () => {
    setBusy(true);
    setInfo('Revealing all hidden fields…');
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, 'showAllFields');
      setInfo('All fields are now visible.');
    });
    setBusy(false);
  };

  const openFormReportPage = async (): Promise<void> => {
    setBusy(true);
    setInfo('Opening form translations report page…');
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, 'openFormReportPage');
      setInfo('Form report page opened.');
    });
    setBusy(false);
  };

  const openPluginTraceLogsPage = async (): Promise<void> => {
    setBusy(true);
    setInfo('Opening plugin trace logs report page…');
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, 'openPluginTraceLogsPage');
      setInfo('Plugin trace logs report page opened.');
    });
    setBusy(false);
  };

  const openGlobalOptionSetsPage = async (): Promise<void> => {
    setBusy(true);
    setInfo('Opening global option sets manager…');
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, 'openGlobalOptionSetsPage');
      setInfo('Global option sets page opened.');
    });
    setBusy(false);
  };

  const openEntityBrowserPage = async (): Promise<void> => {
    setBusy(true);
    setInfo('Opening entity browser…');
    await withGuard(async (tabId, frameId) => {
      await callController(tabId, frameId, 'openEntityBrowserPage');
      setInfo('Entity browser opened.');
    });
    setBusy(false);
  };

  const openAuditHistoryPage = async (): Promise<void> => {
    setBusy(true);
    setInfo('Opening audit history…');
    await withGuard(async (tabId, frameId) => {
      // Call controller to get entity and recordId
      await callController(tabId, frameId, 'openAuditHistory');

      // Open side panel directly (must be in user gesture context)
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'src/sidepanel/index.html',
        enabled: true
      });
      await chrome.sidePanel.open({ tabId });

      setInfo('Audit history opened.');

      // Close the popup after successfully opening the side panel
      window.close();
    });
    setBusy(false);
  };

  const handleClearCacheAndHardRefresh = async (): Promise<void> => {
    setBusy(true);
    setInfo('Clearing cache and refreshing…');
    try {
      await clearCacheAndHardRefresh();
      setInfo('Cache cleared and page refreshed.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return {
    active,
    busy,
    info,
    error,
    activate,
    deactivate,
    showAllFields,
    clearCacheAndHardRefresh: handleClearCacheAndHardRefresh,
    openFormReportPage,
    openPluginTraceLogsPage,
    openGlobalOptionSetsPage,
    openEntityBrowserPage,
    openAuditHistoryPage,
    setInfo,
  };
}
