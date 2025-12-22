/**
 * Type definitions for popup UI components
 */

import type { SelectTabEventHandler } from '@fluentui/react-components';

export type PopupTab = 'general' | 'developer';

export interface ButtonTooltip {
  showAllFields: string;
  clearCache: string;
  highlight: string;
  removeHighlight: string;
  formTranslations: string;
  globalOptionSets: string;
  pluginTraceLogs: string;
  entityBrowser: string;
}

export type TooltipKey = keyof ButtonTooltip;

export interface MessageState {
  type: 'info' | 'error' | 'warning';
  text: string;
}

export interface D365ContextState {
  isValidContext: boolean;
  isDynamicsEnv: boolean;
  contextChecking: boolean;
}

// Proper typing for Fluent UI TabList event
export type TabSelectHandler = SelectTabEventHandler;
