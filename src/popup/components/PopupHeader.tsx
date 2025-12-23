/**
 * Popup header component with theme toggle and status badge
 */

import * as React from 'react';
import { Text, Button, Badge, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import {
  Sparkle24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons';
import { spacing } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';

const useStyles = makeStyles({
  header: {
    ...shorthands.padding(spacing.lg),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(spacing.md),
    boxShadow: tokens.shadow8,
  },
  headerIcon: {
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundOnBrand,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForegroundOnBrand,
    opacity: 0.9,
  },
  themeToggleButton: {
    color: tokens.colorNeutralForegroundOnBrand,
  },
});

interface PopupHeaderProps {
  active: boolean;
}

export function PopupHeader({ active }: PopupHeaderProps) {
  const styles = useStyles();
  const { mode, toggleTheme } = useTheme();

  return (
    <div className={styles.header}>
      <div className={styles.headerIcon}>
        <Sparkle24Regular />
      </div>
      <div className={styles.headerText}>
        <div className={styles.title}>D365 Translation Manager</div>
        <div className={styles.subtitle}>Field & Form Translation Tools</div>
      </div>
      <Button
        appearance="subtle"
        icon={mode === 'dark' ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
        onClick={toggleTheme}
        title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className={styles.themeToggleButton}
      />
      <Badge
        appearance={active ? 'filled' : 'tint'}
        color={active ? 'success' : 'informative'}
        size="large"
      >
        {active ? 'Active' : 'Idle'}
      </Badge>
    </div>
  );
}
