import { makeStyles, tokens } from "@fluentui/react-components";

import { spacing } from "../../styles/theme";

export const usePluginTraceLogPageStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    width: "100%",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  connectionInfo: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    "@media (max-width: 768px)": {
      padding: spacing.lg,
    },
  },
  quickSearchSection: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: spacing.lg,
  },
  quickSearchTitle: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  quickSearchHelp: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  filterSection: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    marginBottom: spacing.xl,
  },
  filterTitle: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    columnGap: spacing.lg,
    rowGap: spacing.lg,
    alignItems: "end",
    "@media (max-width: 1200px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
    },
  },
  filterActions: {
    display: "flex",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  resultsSection: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },
  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  tableContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    overflow: "hidden",
    width: "100%",
    // Responsive table handling
    overflowX: "auto",
    "@media (max-width: 768px)": {
      // Mobile: horizontal scroll for full table
      overflowX: "scroll",
      WebkitOverflowScrolling: "touch",
    },
  },
  errorMessage: {
    padding: spacing.md,
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "48px",
  },
  exceptionText: {
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase200,
    maxWidth: "400px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  expandButton: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    color: tokens.colorBrandForeground1,
  },
  expandedContent: {
    padding: spacing.lg,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  traceBlock: {
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase200,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    backgroundColor: tokens.colorNeutralBackground1,
    padding: spacing.md,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    maxHeight: "400px",
    overflowY: "auto",
  },
  detailRow: {
    display: "flex",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontWeight: tokens.fontWeightSemibold,
    minWidth: "150px",
  },
  responsiveTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: "1200px", // Desktop: full width with all columns
    "@media (min-width: 768px) and (max-width: 1024px)": {
      // Tablet: slightly reduced min-width, flexible columns
      minWidth: "900px",
    },
    "@media (max-width: 767px)": {
      // Mobile: minimum table width, will scroll horizontally
      minWidth: "800px",
    },
  },
  resizableHeader: {
    position: "relative" as const,
    userSelect: "none" as const,
  },
  resizeHandle: {
    position: "absolute" as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: spacing.sm,
    cursor: "col-resize",
    backgroundColor: "transparent",
    ":hover": {
      backgroundColor: tokens.colorBrandBackground,
      opacity: 0.5,
    },
  },
  resizing: {
    backgroundColor: tokens.colorBrandBackground,
    opacity: 0.7,
  },
  scrollSentinel: {
    height: "1px",
    width: "100%",
  },
  loadingMore: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  clickableIcon: {
    cursor: "pointer",
  },
  sortNotice: {
    padding: `${spacing.md} ${spacing.lg}`,
    marginBottom: spacing.md,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
});
