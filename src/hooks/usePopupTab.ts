/**
 * Hook to manage popup tab selection with persistence
 */

import { useChromeStorage } from './useChromeStorage';
import type { PopupTab } from '../types/popup';

export function usePopupTab() {
  const { value: activeTab, setValue: setActiveTab } = useChromeStorage<PopupTab>(
    'popupActiveTab',
    'general'
  );

  return {
    activeTab,
    setActiveTab,
  };
}
