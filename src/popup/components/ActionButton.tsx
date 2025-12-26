/**
 * Reusable action button component with icon and hover support
 */

import { Button, makeStyles } from '@fluentui/react-components';

import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  actionButton: {
    justifyContent: 'flex-start',
    height: '48px',
    padding: spacing.md,
  },
});

interface ActionButtonProps {
  icon: React.ReactElement;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  appearance?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  tooltipKey: string;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function ActionButton({
  icon,
  onClick,
  disabled = false,
  appearance = 'secondary',
  size = 'large',
  children,
  onMouseEnter,
  onMouseLeave,
}: ActionButtonProps) {
  const styles = useStyles();

  return (
    <Button
      appearance={appearance}
      size={size}
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      className={styles.actionButton}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Button>
  );
}
