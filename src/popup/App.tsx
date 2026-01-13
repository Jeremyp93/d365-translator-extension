/**
 * Main popup application component
 * Orchestrates UI components and manages top-level state
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  FluentProvider,
  makeStyles,
  tokens,
  TabList,
  Tab,
} from '@fluentui/react-components';
import { Home20Regular, Settings20Regular } from '@fluentui/react-icons';

import { spacing } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { useD365Controller } from '../hooks/useD365Controller';
import { useD365Context } from '../hooks/useD365Context';
import { useEditingPermission } from '../hooks/useEditingPermission';
import { usePopupTab } from '../hooks/usePopupTab';
import { useAutoDismiss } from '../hooks/useAutoDismiss';
import { useLanguages } from '../hooks/useLanguages';
import { getActiveTab } from '../services/chromeTabService';
import { getLanguageDisplayName } from '../utils/languageNames';
import { PopupHeader } from './components/PopupHeader';
import { ContextWarning } from './components/ContextWarning';
import { EditingBlockedBanner } from '../components/ui/EditingBlockedBanner';
import { ErrorMessage, InfoMessage } from './components/MessageDisplay';
import { TooltipArea } from './components/TooltipArea';
import { GeneralTab } from './components/GeneralTab';
import { DeveloperTab } from './components/DeveloperTab';
import { BUTTON_TOOLTIPS } from './constants';
import type { TooltipKey, TabSelectHandler } from '../types/popup';

const useStyles = makeStyles({
  popup: {
    width: '360px',
    minHeight: '500px',
    maxHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'relative',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  contentWrapper: {
    padding: spacing.lg,
    gap: spacing.md,
    display: 'flex',
    flexDirection: 'column',
  },
  stickyspacer: {
    height: '8px',
    flexShrink: 0,
  },
  tabMenu: {
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopWidth: '2px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke1,
    boxShadow: tokens.shadow16,
    display: 'flex',
    padding: `${spacing.sm} 0`,
    zIndex: 1000,
    '& .fui-TabList': {
      width: '100%',
      display: 'flex',
    },
    '& .fui-Tab': {
      flex: 1,
      justifyContent: 'center',
    },
  },
});

export default function App(): JSX.Element {
  const styles = useStyles();
  const { theme } = useTheme();
  const { activeTab, setActiveTab } = usePopupTab();
  const { isValidContext, isDynamicsEnv, contextChecking } = useD365Context();
  const {
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
    openAuditHistoryPage,
    setInfo,
  } = useD365Controller();

  const [hoveredButton, setHoveredButton] = useState<TooltipKey | null>(null);
  const [clientUrl, setClientUrl] = useState<string>("");
  const [currentUserLcid, setCurrentUserLcid] = useState<number | null>(null);
  const [switchingLanguage, setSwitchingLanguage] = useState<boolean>(false);
  const languageSwitchTimerRef = useRef<number | null>(null);

  // Initialize language hook
  const { langs, readUserUiLanguage, switchUserUiLanguage, error: languageError } = useLanguages(clientUrl);

  // Get client URL from active tab
  useEffect(() => {
    
    const getUrl = async () => {
      try {
        const tab = await getActiveTab();
        if (tab?.url) {
          // Extract base URL (e.g., https://org.crm.dynamics.com)
          const url = new URL(tab.url);
          const baseUrl = `${url.protocol}//${url.host}`;
          setClientUrl(baseUrl);
        }
      } catch (e) {
        console.error('Failed to get client URL:', e);
        setClientUrl("");
      }
    };
    if (contextChecking || !isDynamicsEnv) {
      setClientUrl("");
      return;
    }

  getUrl();
  }, [isDynamicsEnv, contextChecking]);

  // Load current user language
  useEffect(() => {
    if (!clientUrl || !isDynamicsEnv) {
      setCurrentUserLcid(null);
      return;
    }

    const loadCurrentLanguage = async () => {
      try {
        const lcid = await readUserUiLanguage();
        setCurrentUserLcid(lcid);
      } catch (e) {
        console.error('Failed to get current language:', e);
      }
    };

    loadCurrentLanguage();
  }, [clientUrl, isDynamicsEnv, readUserUiLanguage]);

  // Check editing permission (hook must be called unconditionally)
  const { isEditingBlocked } = useEditingPermission(clientUrl);

  // Auto-dismiss info messages
  useAutoDismiss(info, () => setInfo(null), 3000);

  // Cleanup language switch timer on unmount
  useEffect(() => {
    return () => {
      if (languageSwitchTimerRef.current) {
        clearTimeout(languageSwitchTimerRef.current);
      }
    };
  }, []);

  const handleTabChange = useCallback<TabSelectHandler>(
    (_, data) => {
      setActiveTab(data.value as 'general' | 'developer');
    },
    [setActiveTab]
  );

  const handleLanguageSwitch = useCallback(
    async (targetLcid: number) => {
      // Clear any existing timer
      if (languageSwitchTimerRef.current) {
        clearTimeout(languageSwitchTimerRef.current);
        languageSwitchTimerRef.current = null;
      }

      setSwitchingLanguage(true);
      const langName = getLanguageDisplayName(targetLcid);
      setInfo(`Switching to ${langName}...`);

      // Capture the current tab BEFORE the async operation
      const currentTab = await getActiveTab();
      if (!currentTab?.id) {
        setInfo(null);
        setSwitchingLanguage(false);
        setInfo('Failed to switch language: No active tab found.');
        return;
      }

      const targetTabId = currentTab.id; // Capture the tab ID

      try {
        await switchUserUiLanguage(targetLcid);
        setCurrentUserLcid(targetLcid); // Update local state to reflect the change
        setInfo(`Language changed to ${langName}. Reloading page...`);

        // Hard reload the captured D365 tab after a short delay (bypass cache)
        languageSwitchTimerRef.current = setTimeout(async () => {
          try {
            await chrome.tabs.reload(targetTabId, { bypassCache: true });
            // Re-enable dropdown after reload is triggered
            setSwitchingLanguage(false);
          } catch (e) {
            console.error('Failed to reload tab:', e);
          } finally {
            languageSwitchTimerRef.current = null;
          }
        }, 1500);
      } catch (e) {
        console.error('Failed to switch language:', e);
        setInfo(null); // Clear "Switching..." message
        setSwitchingLanguage(false);
        // Show user-friendly error message
        if (error) {
          // If there's already an error showing, log to console only
          console.error('Cannot display error - error banner already in use');
        } else {
          setInfo('Failed to switch language. Please try again.');
        }
      }
    },
    [switchUserUiLanguage, setInfo, error]
  );

  return (
    <FluentProvider theme={theme}>
      <div className={styles.popup}>
        <PopupHeader active={active} />

        <div className={styles.content}>
          <div className={styles.contentWrapper}>
            <ContextWarning
              activeTab={activeTab}
              isDynamicsEnv={isDynamicsEnv}
              contextChecking={contextChecking}
            />

            <EditingBlockedBanner visible={isEditingBlocked} />

            {error && <ErrorMessage>{error}</ErrorMessage>}
            {info && !error && <InfoMessage>{info}</InfoMessage>}

            {activeTab === 'general' && (
              <GeneralTab
                appState={{
                  busy,
                  active,
                  isValidContext,
                  isDynamicsEnv,
                  contextChecking,
                }}
                language={{
                  switching: switchingLanguage,
                  available: langs || [],
                  currentLcid: currentUserLcid,
                  loading: !langs && !languageError,
                  error: languageError,
                  onSwitch: handleLanguageSwitch,
                }}
                onShowAllFields={showAllFields}
                onActivate={activate}
                onDeactivate={deactivate}
                onOpenFormReport={openFormReportPage}
                onOpenGlobalOptionSets={openGlobalOptionSetsPage}
                onOpenEntityBrowser={openEntityBrowserPage}
                onOpenAuditHistory={openAuditHistoryPage}
                onHoverButton={setHoveredButton}
              />
            )}

            {activeTab === 'developer' && (
              <DeveloperTab
                busy={busy}
                isDynamicsEnv={isDynamicsEnv}
                contextChecking={contextChecking}
                onClearCache={clearCacheAndHardRefresh}
                onOpenPluginTraceLogs={openPluginTraceLogsPage}
                onHoverButton={setHoveredButton}
              />
            )}

            <div className={styles.stickyspacer} />
          </div>
        </div>

        <TooltipArea hoveredButton={hoveredButton} tooltips={BUTTON_TOOLTIPS} />

        <div className={styles.tabMenu}>
          <TabList selectedValue={activeTab} onTabSelect={handleTabChange} size="large">
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
