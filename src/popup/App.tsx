/**
 * Main popup application component
 * Orchestrates UI components and manages top-level state
 */

import * as React from 'react';
import {
  FluentProvider,
  makeStyles,
  shorthands,
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
import { getActiveTab } from '../services/chromeTabService';
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
    ...shorthands.padding(spacing.lg),
    ...shorthands.gap(spacing.md),
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
    ...shorthands.padding(spacing.sm, 0),
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
    setInfo,
  } = useD365Controller();

  const [hoveredButton, setHoveredButton] = React.useState<TooltipKey | null>(null);
  const [clientUrl, setClientUrl] = React.useState<string>("");

  // Get client URL from active tab
  React.useEffect(() => {
    if (!isDynamicsEnv) return; // No need to get URL if not in Dynamics environment
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
      }
    };
    getUrl();
  }, [isDynamicsEnv]);

  // Check editing permission (hook must be called unconditionally)
  const { isEditingBlocked } = useEditingPermission(clientUrl);

  // Auto-dismiss info messages
  useAutoDismiss(info, () => setInfo(null), 3000);

  const handleTabChange = React.useCallback<TabSelectHandler>(
    (_, data) => {
      setActiveTab(data.value as 'general' | 'developer');
    },
    [setActiveTab]
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
                busy={busy}
                active={active}
                isValidContext={isValidContext}
                isDynamicsEnv={isDynamicsEnv}
                contextChecking={contextChecking}
                onShowAllFields={showAllFields}
                onActivate={activate}
                onDeactivate={deactivate}
                onOpenFormReport={openFormReportPage}
                onOpenGlobalOptionSets={openGlobalOptionSetsPage}
                onOpenEntityBrowser={openEntityBrowserPage}
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
