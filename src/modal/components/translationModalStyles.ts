import { makeStyles, tokens, shorthands } from "@fluentui/react-components";

/**
 * Fresh, modern styles for the Translation Modal
 * Design philosophy: "Elevated Minimal" - soft depth, smooth motion, generous whitespace
 */
export const useTranslationModalStyles = makeStyles({
  modalSurface: {
    display: "flex",
    flexDirection: "column",
    height: "90vh",
    maxHeight: "900px",
    width: "90vw",
    maxWidth: "800px",
    ...shorthands.padding(0),
    ...shorthands.overflow("hidden"),
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    ...shorthands.padding("20px", "24px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    minHeight: "72px",
  },

  headerContent: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("4px"),
    flex: 1,
  },

  headerTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase500,
    marginTop: 0,
    marginBottom: 0,
  },

  headerSubtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    lineHeight: tokens.lineHeightBase300,
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },

  tabBar: {
    ...shorthands.padding("0", "24px"),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },

  content: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    ...shorthands.padding("24px"),
    backgroundColor: tokens.colorNeutralBackground2,
    boxSizing: "border-box",

    // Custom scrollbar styling
    "::-webkit-scrollbar": {
      width: "8px",
    },
    "::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: tokens.colorNeutralStroke1,
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
      ":hover": {
        backgroundColor: tokens.colorNeutralStroke2,
      },
    },
  },

  cardsContainer: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("12px"),
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...shorthands.padding("48px"),
    flexDirection: "column",
    ...shorthands.gap("16px"),
  },

  errorContainer: {
    ...shorthands.padding("16px"),
  },

  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    ...shorthands.padding("16px", "24px"),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    backdropFilter: "blur(20px)",
    position: "sticky",
    bottom: 0,
    zIndex: 1,

    // Smooth transition
    transitionProperty: "all",
    transitionDuration: "200ms",
    transitionTimingFunction: "ease-out",
  },

  footerActions: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("12px"),
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    ...shorthands.padding("48px", "24px"),
    ...shorthands.gap("12px"),
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
});

/**
 * Styles for individual language cards
 */
export const useLanguageCardStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    ...shorthands.padding("16px", "20px"),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    boxShadow: tokens.shadow4,
    ...shorthands.border("1px", "solid", "transparent"),

    // Smooth transitions
    transitionProperty: "all",
    transitionDuration: "200ms",
    transitionTimingFunction: "ease-out",

    ":hover": {
      boxShadow: tokens.shadow8,
      transform: "translateY(-1px)",
    },

    ":focus-within": {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      boxShadow: `0 0 0 2px ${tokens.colorBrandBackground2}`,
    },
  },

  cardDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",

    ":hover": {
      boxShadow: tokens.shadow4,
      transform: "none",
    },
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  languageInfo: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },

  languageName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },

  lcidBadge: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("2px", "8px"),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },

  badges: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },

  baseBadge: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.padding("4px", "10px"),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },

  modifiedIndicator: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("6px"),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPalettePurpleForeground2,
    fontWeight: tokens.fontWeightMedium,
  },

  modifiedDot: {
    width: "6px",
    height: "6px",
    ...shorthands.borderRadius("50%"),
    backgroundColor: tokens.colorPalettePurpleBorderActive,
  },

  inputWrapper: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    minWidth: 0, // Allow flex items to shrink below content size
  },

  input: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
});
