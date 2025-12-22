/**
 * Reusable message display components for info/error/warning states
 */

import * as React from 'react';
import { Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  message: {
    ...shorthands.padding(spacing.sm, spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontSize: tokens.fontSizeBase200,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(spacing.xs),
  },
  errorMessage: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.border('1px', 'solid', tokens.colorPaletteRedBorder2),
  },
  infoMessage: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
  },
  warningMessage: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteYellowForeground2,
    ...shorthands.border('1px', 'solid', tokens.colorPaletteYellowBorder2),
  },
});

interface MessageProps {
  title?: string;
  children: React.ReactNode;
}

export function ErrorMessage({ title = 'Error:', children }: MessageProps) {
  const styles = useStyles();
  return (
    <div className={`${styles.message} ${styles.errorMessage}`}>
      <Text weight="semibold">{title}</Text>
      <Text>{children}</Text>
    </div>
  );
}

export function InfoMessage({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <div className={`${styles.message} ${styles.infoMessage}`}>
      <Text>{children}</Text>
    </div>
  );
}

export function WarningMessage({ title, children }: MessageProps) {
  const styles = useStyles();
  return (
    <div className={`${styles.message} ${styles.warningMessage}`}>
      <Text weight="semibold">{title}</Text>
      <Text>{children}</Text>
    </div>
  );
}
