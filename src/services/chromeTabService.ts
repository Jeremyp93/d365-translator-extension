/**
 * Service layer for Chrome Tab and Scripting APIs
 * Framework-agnostic utilities for interacting with Chrome extension APIs
 */

import type { ChromeTab, D365Window, ControllerMethod } from '../types/chromeExtension';

/**
 * Get the currently active tab
 */
export async function getActiveTab(): Promise<ChromeTab | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab || null;
}

/**
 * Find the frame ID that contains window.Xrm
 */
export async function findXrmFrameId(tabId: number): Promise<number | null> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: 'MAIN',
    func: () => Boolean((window as D365Window).Xrm),
  });

  const hit = results.find((r) => r.result === true);
  return hit?.frameId ?? null;
}

/**
 * Check if the D365 controller exists in the frame
 */
export async function controllerExists(
  tabId: number,
  frameId: number
): Promise<boolean> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: 'MAIN',
    func: () => Boolean((window as D365Window).__d365Ctl),
  });

  return results[0]?.result === true;
}

/**
 * Get controller state from the page
 */
export async function getControllerState(
  tabId: number,
  frameId: number
): Promise<boolean> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: 'MAIN',
    func: () => Boolean((window as D365Window).__d365Ctl?.enabled),
  });

  return results[0]?.result === true;
}

/**
 * Inject controller scripts into the frame
 */
export async function injectController(
  tabId: number,
  frameId: number
): Promise<void> {
  // Inject relay first
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    files: ['assets/relay.js'],
  });

  // Inject page controller
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: 'MAIN',
    files: ['assets/pageController.js'],
  });
}

/**
 * Insert highlight CSS into the frame
 */
export async function insertHighlightCss(
  tabId: number,
  frameId: number
): Promise<void> {
  await chrome.scripting.insertCSS({
    target: { tabId, frameIds: [frameId] },
    files: ['assets/highlight.css'],
    origin: 'USER',
  });
}

/**
 * Remove highlight CSS from the frame
 */
export async function removeHighlightCss(
  tabId: number,
  frameId: number
): Promise<void> {
  try {
    await chrome.scripting.removeCSS({
      target: { tabId, frameIds: [frameId] },
      files: ['assets/highlight.css'],
      origin: 'USER',
    });
  } catch {
    // Ignore if CSS wasn't injected
  }
}

/**
 * Call a method on the D365 controller
 */
export async function callController(
  tabId: number,
  frameId: number,
  method: ControllerMethod
): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: 'MAIN',
    func: (m: ControllerMethod) => {
      const ctl = (window as D365Window).__d365Ctl;
      if (!ctl) throw new Error('Controller missing');
      ctl[m]();
    },
    args: [method],
  });
}

/**
 * Save highlight active state to Chrome session storage
 */
export async function saveHighlightState(
  tabId: number,
  isActive: boolean
): Promise<void> {
  const storageKey = `highlightActive_${tabId}`;
  if (isActive) {
    await chrome.storage.session.set({ [storageKey]: true });
  } else {
    await chrome.storage.session.remove(storageKey);
  }
}

/**
 * Clear all cached/site data for the given tab's origin, then hard reload.
 * Equivalent to DevTools "Empty Cache and Hard Reload".
 *
 * Use this (rather than a bare `tabs.reload`) whenever stale client-side state
 * must not survive the reload — e.g. after a D365 UI language change, where the
 * Unified Interface caches labels/metadata in IndexedDB + service worker caches.
 */
export async function clearSiteDataAndReload(tabId: number, origin: string): Promise<void> {
  // 1) Clear site-scoped data for the origin (IndexedDB, SW caches, etc.).
  //    The HTTP cache for the reloaded origin is handled by bypassCache below;
  //    a global cache wipe would needlessly evict every other site's cache.
  await chrome.browsingData.remove(
    { since: 0, origins: [origin] },
    {
      cacheStorage: true,
      indexedDB: true,
      localStorage: true,
      serviceWorkers: true,
      webSQL: true,
    }
  );

  // 2) Clear per-tab storage (best-effort; the origin filter above already covers it)
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        try {
          window.localStorage?.clear?.();
        } catch {}
        try {
          window.sessionStorage?.clear?.();
        } catch {}
      },
    });
  } catch {}

  // 3) Hard reload bypassing cache
  await chrome.tabs.reload(tabId, { bypassCache: true });
}

/**
 * Clear all cache and perform hard refresh for the current tab.
 */
export async function clearCacheAndHardRefresh(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) return;

  try {
    await clearSiteDataAndReload(tab.id, new URL(tab.url).origin);
  } catch (e) {
    console.warn('[chromeTabService] clearCacheAndHardRefresh failed:', e);
    throw e;
  }
}
