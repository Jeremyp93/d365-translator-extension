/**
 * Developer tab content - Developer tools and utilities
 */

import { makeStyles, tokens } from '@fluentui/react-components';
import { ArrowClockwise24Regular, Sparkle24Regular } from '@fluentui/react-icons';

import { spacing } from '../../styles/theme';
import { ActionButton } from './ActionButton';
import type { TooltipKey } from '../../types/popup';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: spacing.xs,
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
});

interface DeveloperTabProps {
  busy: boolean;
  isDynamicsEnv: boolean;
  contextChecking: boolean;
  onClearCache: () => void;
  onOpenPluginTraceLogs: () => void;
  onHoverButton: (key: TooltipKey | null) => void;
}

export function DeveloperTab({
  busy,
  isDynamicsEnv,
  contextChecking,
  onClearCache,
  onOpenPluginTraceLogs,
  onHoverButton,
}: DeveloperTabProps) {
  const styles = useStyles();

  return (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Developer Tools</div>
        <div className={styles.buttonGroup}>
          <ActionButton
            icon={<ArrowClockwise24Regular />}
            onClick={onClearCache}
            disabled={busy || !isDynamicsEnv || contextChecking}
            onMouseEnter={() => onHoverButton('clearCache')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="clearCache"
          >
            Clear Cache & Refresh
          </ActionButton>

          <ActionButton
            appearance="primary"
            icon={<Sparkle24Regular />}
            onClick={onOpenPluginTraceLogs}
            disabled={busy || !isDynamicsEnv || contextChecking}
            onMouseEnter={() => onHoverButton('pluginTraceLogs')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="pluginTraceLogs"
          >
            Plugin Trace Logs
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
