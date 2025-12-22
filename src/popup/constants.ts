/**
 * Constants for popup UI
 */

import type { ButtonTooltip } from '../types/popup';

export const BUTTON_TOOLTIPS: ButtonTooltip = {
  showAllFields:
    'Temporarily reveal all hidden controls and fields on the current form',
  clearCache:
    'Clear browser cache and perform a hard refresh of the current page',
  highlight:
    'Highlight all translatable fields on the form. Click any highlighted field to open its translation editor.',
  removeHighlight:
    'Remove field highlighting and disable the translation overlay',
  formTranslations:
    'Open the comprehensive form translations editor in a new tab',
  globalOptionSets:
    'Manage translations for global option sets shared across entities',
  pluginTraceLogs:
    'View plugin execution trace logs with filtering options',
  entityBrowser:
    'Browse all entities and attributes with translation capabilities',
};
