import { tokens, makeStyles, shorthands } from "@fluentui/react-components";

/**
 * Shared theme configuration for D365 Translator Extension
 * Provides consistent colors, spacing, and styles across all pages
 */

export const themeColors = {
  primary: tokens.colorBrandBackground,
  primaryHover: tokens.colorBrandBackgroundHover,
  primaryPressed: tokens.colorBrandBackgroundPressed,
  
  background: {
    base: tokens.colorNeutralBackground1,
    elevated: tokens.colorNeutralBackground2,
    card: tokens.colorNeutralBackgroundStatic,
  },
  
  text: {
    primary: tokens.colorNeutralForeground1,
    secondary: tokens.colorNeutralForeground2,
    tertiary: tokens.colorNeutralForeground3,
    onBrand: tokens.colorNeutralForegroundOnBrand,
  },
  
  border: {
    default: tokens.colorNeutralStroke1,
    subtle: tokens.colorNeutralStroke2,
  },
  
  status: {
    success: tokens.colorPaletteGreenBackground3,
    successText: tokens.colorPaletteGreenForeground1,
    error: tokens.colorStatusDangerBackground2,
    errorText: tokens.colorStatusDangerForeground2,
    warning: tokens.colorPaletteYellowBackground3,
    warningText: tokens.colorPaletteYellowForeground2,
    info: tokens.colorBrandBackground2,
    infoText: tokens.colorNeutralForegroundOnBrand,
  },
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
};

export const borderRadius = {
  sm: tokens.borderRadiusSmall,
  md: tokens.borderRadiusMedium,
  lg: tokens.borderRadiusLarge,
};

/**
 * Shared styles that can be used across components
 */
export const useSharedStyles = makeStyles({
  pageContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  
  pageHeader: {
    ...shorthands.padding(spacing.lg, spacing.xl),
    ...shorthands.borderBottom("2px", "solid", tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
  },
  
  pageTitle: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    //marginBottom: spacing.sm,
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.md),
  },
  
  pageSubtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    //marginTop: spacing.xs,
  },

  pageConnectionInfo: {
      fontSize: tokens.fontSizeBase200,
      color: tokens.colorNeutralForeground3,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: spacing.xs
    },
  
  section: {
    ...shorthands.padding(spacing.lg),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(borderRadius.md),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    boxShadow: tokens.shadow4,
    marginBottom: spacing.lg,
  },
  
  sectionHeader: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: spacing.md,
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(borderRadius.md),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.padding(spacing.lg),
    boxShadow: tokens.shadow4,
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
    ":hover": {
      boxShadow: tokens.shadow16,
    },
  },
  
  cardInteractive: {
    cursor: "pointer",
    ":hover": {
      boxShadow: tokens.shadow16,
      transform: "translateY(-2px)",
    },
    ":active": {
      transform: "translateY(0)",
    },
  },
  
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    ...shorthands.borderRadius(borderRadius.sm),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  
  iconContainerLarge: {
    width: "48px",
    height: "48px",
    fontSize: "24px",
  },
  
  metaText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  
  divider: {
    ...shorthands.margin(spacing.md, "0"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },
  
  actionBar: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
    flexWrap: "wrap",
  },
  
  statusBadge: {
    ...shorthands.padding(spacing.xs, spacing.md),
    ...shorthands.borderRadius(borderRadius.sm),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  
  successMessage: {
    backgroundColor: themeColors.status.success,
    color: themeColors.status.successText,
    ...shorthands.padding(spacing.md),
    ...shorthands.borderRadius(borderRadius.md),
    ...shorthands.border("1px", "solid", themeColors.status.successText),
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  
  errorMessage: {
    backgroundColor: themeColors.status.error,
    color: themeColors.status.errorText,
    ...shorthands.padding(spacing.md),
    ...shorthands.borderRadius(borderRadius.md),
    ...shorthands.border("1px", "solid", themeColors.status.errorText),
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  
  infoMessage: {
    backgroundColor: themeColors.status.info,
    color: themeColors.status.infoText,
    ...shorthands.padding(spacing.md),
    ...shorthands.borderRadius(borderRadius.md),
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding(spacing.md),
    ...shorthands.borderRadius(borderRadius.md),
    fontSize: tokens.fontSizeBase200,
    fontFamily: tokens.fontFamilyMonospace,
    overflowX: "auto",
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
  },
  
  scrollContainer: {
    overflowY: "auto",
    overflowX: "hidden",
    ...shorthands.padding(spacing.lg),
    "::-webkit-scrollbar": {
      width: "8px",
    },
    "::-webkit-scrollbar-track": {
      backgroundColor: tokens.colorNeutralBackground1,
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: tokens.colorNeutralStroke1,
      ...shorthands.borderRadius("4px"),
      ":hover": {
        backgroundColor: tokens.colorNeutralStroke2,
      },
    },
  },
  
  flexRow: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },
  
  flexColumn: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.sm),
  },
  
  grow: {
    flex: 1,
  },
});

/**
 * Animation utilities
 */
export const animations = {
  fadeIn: {
    animationName: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    animationDuration: "0.3s",
    animationTimingFunction: "ease-in-out",
  },
  
  slideIn: {
    animationName: {
      from: { transform: "translateY(-10px)", opacity: 0 },
      to: { transform: "translateY(0)", opacity: 1 },
    },
    animationDuration: "0.3s",
    animationTimingFunction: "ease-out",
  },
};
