import { makeStyles, tokens, shorthands } from "@fluentui/react-components";
import { spacing } from "../../styles/theme";

/**
 * Color theme definitions for each editor type
 */
export const editorThemes = {
  entity: {
    borderColor: tokens.colorPaletteBlueBackground2,
    iconWrapperBg: tokens.colorPaletteBlueBackground1,
    iconColor: tokens.colorPaletteBlueForeground2,
  },
  form: {
    borderColor: tokens.colorPaletteGreenBackground2,
    iconWrapperBg: tokens.colorPaletteGreenBackground1,
    iconColor: tokens.colorPaletteGreenForeground2,
  },
  optionSet: {
    borderColor: tokens.colorPalettePurpleBackground2,
    iconWrapperBg: tokens.colorPalettePurpleBackground1,
    iconColor: tokens.colorPalettePurpleForeground2,
  },
} as const;

/**
 * Shared styles for all V2 editor components
 */
export const useEditorStyles = makeStyles({
  // Main container
  editorContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(spacing.xl),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
    ...shorthands.transition("box-shadow", "0.2s", "ease"),
    ":hover": {
      boxShadow: tokens.shadow8,
    },
    "@media (max-width: 768px)": {
      ...shorthands.padding(spacing.md),
    },
  },

  // Header section with icon and title
  editorHeader: {
    display: "flex",
    alignItems: "flex-start",
    ...shorthands.gap(spacing.md),
  },

  // Circular icon wrapper
  iconWrapper: {
    width: "40px",
    height: "40px",
    ...shorthands.borderRadius("50%"),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Header text container
  headerTextContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("4px"),
  },

  // Header title
  headerTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase400,
  },

  // Header subtitle
  headerSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    lineHeight: tokens.lineHeightBase200,
  },

  // Badge container for header
  headerBadgeContainer: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  },

  // Content section
  editorContent: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.md),
  },

  // Divider with spacing
  contentDivider: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  // Action bar at bottom
  editorActions: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.md),
    ...shorthands.padding(spacing.md, 0, 0, 0),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    "@media (max-width: 480px)": {
      flexDirection: "column",
      ...shorthands.gap(spacing.sm),
    },
  },

  // Action button styling
  actionButton: {
    minHeight: "36px",
    minWidth: "140px",
    ...shorthands.transition("transform", "0.15s", "ease"),
    ":hover:not(:disabled)": {
      transform: "translateY(-1px)",
    },
    ":active:not(:disabled)": {
      transform: "translateY(0)",
    },
    "@media (max-width: 480px)": {
      width: "100%",
      minWidth: "auto",
    },
  },

  // Hint text next to buttons
  actionHint: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginLeft: spacing.sm,
    "@media (max-width: 480px)": {
      marginLeft: 0,
      textAlign: "center",
    },
  },

  // Empty state container
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    ...shorthands.padding(spacing.xl, spacing.md),
    ...shorthands.gap(spacing.md),
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },

  // Option row (for OptionSetEditor)
  optionRow: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(spacing.sm),
    ...shorthands.padding(spacing.md, 0),
  },

  // Option header
  optionHeader: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
    marginBottom: spacing.sm,
  },

  // Option label text
  optionLabel: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
  },

  // Table wrapper with scroll
  tableWrapper: {
    maxHeight: "500px",
    overflowY: "auto",
  },
});
