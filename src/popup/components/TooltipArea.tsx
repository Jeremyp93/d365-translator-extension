/**
 * Sticky tooltip display area at bottom of popup
 */

import { Text, makeStyles, tokens } from '@fluentui/react-components';

import { spacing } from '../../styles/theme';
import type { TooltipKey, ButtonTooltip } from '../../types/popup';

const useStyles = makeStyles({
  tooltipArea: {
    position: 'sticky',
    bottom: '52px',
    minHeight: '48px',
    padding: spacing.md,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    alignItems: 'center',
    boxShadow: tokens.shadow8,
    zIndex: 999,
  },
  tooltipText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.4',
  },
});

interface TooltipAreaProps {
  hoveredButton: TooltipKey | null;
  tooltips: ButtonTooltip;
}

export function TooltipArea({ hoveredButton, tooltips }: TooltipAreaProps) {
  const styles = useStyles();

  const tooltipText = hoveredButton
    ? tooltips[hoveredButton]
    : 'Hover over a button to see its description';

  return (
    <div className={styles.tooltipArea}>
      <Text className={styles.tooltipText}>{tooltipText}</Text>
    </div>
  );
}
