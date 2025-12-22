/**
 * Type definitions for Chrome Extension APIs and D365 page interactions
 */

// Chrome tab and scripting result types
export interface ChromeScriptResult<T = unknown> {
  frameId: number;
  result: T;
}

// Use Chrome's native Tab type instead of custom interface
export type ChromeTab = chrome.tabs.Tab;

// D365 page controller types
export interface D365Controller {
  enabled: boolean;
  enable: () => void;
  disable: () => void;
  showAllFields: () => void;
  openFormReportPage: () => void;
  openPluginTraceLogsPage: () => void;
  openGlobalOptionSetsPage: () => void;
  openEntityBrowserPage: () => void;
}

// Window extensions for D365
export interface D365Window extends Window {
  Xrm?: unknown;
  __d365Ctl?: D365Controller;
}

// Chrome storage keys
export interface PopupStorageKeys {
  popupActiveTab: 'general' | 'developer';
  themeMode: 'light' | 'dark';
}

export type ControllerMethod =
  | 'enable'
  | 'disable'
  | 'showAllFields'
  | 'openFormReportPage'
  | 'openPluginTraceLogsPage'
  | 'openGlobalOptionSetsPage'
  | 'openEntityBrowserPage';
