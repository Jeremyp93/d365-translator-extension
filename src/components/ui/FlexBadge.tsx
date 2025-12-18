import * as React from 'react';
import { Badge, BadgeProps, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
  },
  label: {
    flex: 1,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  badge: {
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
});

export interface FlexBadgeProps {
  /** The main label text (can wrap to multiple lines) */
  label: React.ReactNode;
  /** The badge text */
  badge: string;
  /** Badge color */
  badgeColor?: BadgeProps['color'];
  /** Badge appearance */
  badgeAppearance?: BadgeProps['appearance'];
  /** Additional className for the label */
  labelClassName?: string;
  /** Additional style for the label */
  labelStyle?: React.CSSProperties;
  /** Additional className for the container */
  className?: string;
}

/**
 * A flexible badge component that displays a label with a badge.
 * The label can wrap to multiple lines while the badge stays aligned at the top.
 *
 * @example
 * ```tsx
 * <FlexBadge
 *   label="Main Bookable Resource Form"
 *   badge="Form"
 *   badgeColor="informative"
 *   badgeAppearance="filled"
 * />
 * ```
 */
export default function FlexBadge({
  label,
  badge,
  badgeColor = 'informative',
  badgeAppearance = 'filled',
  labelClassName,
  labelStyle,
  className,
}: FlexBadgeProps): JSX.Element {
  const styles = useStyles();

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={`${styles.label} ${labelClassName || ''}`} style={labelStyle}>
        {label}
      </div>
      <Badge color={badgeColor} appearance={badgeAppearance} className={styles.badge}>
        {badge}
      </Badge>
    </div>
  );
}
