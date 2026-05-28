import { Fragment } from "react";
import { makeStyles, tokens, Button, Badge, Text } from "@fluentui/react-components";
import {
  ChevronRight20Regular,
  ChevronDown20Regular,
  FlowRegular,
} from "@fluentui/react-icons";

import {
  PluginTraceLog,
  formatDuration,
  getModeLabel,
  getOperationTypeLabel,
  getDurationColor,
} from "../../services/pluginTraceLogService";
import ResultsTableExpandedRow from "./ResultsTableExpandedRow";
import { getCorrelationColor } from "../../utils/correlationColors";
import { spacing } from "../../styles/theme";

const useStyles = makeStyles({
  tableRow: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
  },
  tableRowSelected: {
    backgroundColor: tokens.colorBrandBackground2Hover,
    "& > td": {
      backgroundColor: tokens.colorBrandBackground2Hover,
      borderTop: `1px solid ${tokens.colorBrandStroke1}`,
      borderBottom: `1px solid ${tokens.colorBrandStroke1}`,
    },
  },
  tableCell: {
    padding: spacing.sm,
  },
  tableCellCenter: {
    padding: spacing.sm,
    textAlign: "center",
  },
  tableCellTypeName: {
    padding: spacing.sm,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  expandedRow: {
    padding: 0,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  expandButton: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    color: tokens.colorBrandForeground1,
  },
  exceptionText: {
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase200,
    maxWidth: "400px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  flexColumn: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  groupSeparator: {
    borderBottom: `3px solid ${tokens.colorNeutralStroke1}`,
  },
});

interface ResultsTableRowProps {
  log: PluginTraceLog;
  isExpanded: boolean;
  isLastInGroup?: boolean;
  typeNameWidth: number;
  onToggleRow: (rowId: string) => void;
  onViewFlow?: (correlationId: string, rowId: string) => void;
  isSelected?: boolean;
  onRowClick?: (
    rowId: string,
    modifiers: { shiftKey: boolean; ctrlOrMeta: boolean }
  ) => void;
}

function ResultsTableRow({
  log,
  isExpanded,
  isLastInGroup,
  typeNameWidth,
  onToggleRow,
  onViewFlow,
  isSelected,
  onRowClick,
}: ResultsTableRowProps) {
  const styles = useStyles();

  const hasDetails = !!(
    log.messageblock ||
    log.exceptiondetails ||
    log.correlationid
  );

  const borderColor = log.correlationid
    ? getCorrelationColor(log.correlationid)
    : "transparent";

  const isInteractiveTarget = (target: HTMLElement) =>
    !!target.closest('button, a, input, [role="button"]');

  // Browsers shift-click-select text by default; suppress that on rows so shift-click can extend the row range.
  const handleMouseDown = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (!onRowClick) return;
    if (isInteractiveTarget(e.target as HTMLElement)) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (!onRowClick) return;
    const target = e.target as HTMLElement;
    if (isInteractiveTarget(target)) return;

    const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!hasModifier) {
      // Plain click: don't hijack if the user is actively selecting text in a cell.
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return;
    } else {
      // Modifier click: clear any stray text selection from the click so highlights stay clean.
      window.getSelection()?.removeAllRanges();
    }

    onRowClick(log.plugintracelogid, {
      shiftKey: e.shiftKey,
      ctrlOrMeta: e.ctrlKey || e.metaKey,
    });
  };

  const rowClassName = [
    styles.tableRow,
    isSelected ? styles.tableRowSelected : "",
    isLastInGroup ? styles.groupSeparator : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Fragment>
      <tr
        data-row-id={log.plugintracelogid}
        className={rowClassName}
        style={{ borderLeft: `4px solid ${borderColor}` }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        aria-selected={isSelected}
      >
        <td className={styles.tableCellCenter}>
          {hasDetails && (
            <div
              className={styles.expandButton}
              onClick={() => onToggleRow(log.plugintracelogid)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                  if (e.key === " " || e.key === "Spacebar") {
                    e.preventDefault(); // Prevent page scroll
                  }
                  onToggleRow(log.plugintracelogid);
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown20Regular />
              ) : (
                <ChevronRight20Regular />
              )}
            </div>
          )}
        </td>
        <td className={styles.tableCellCenter}>
          {log.correlationid && onViewFlow && (
            <Button
              appearance="subtle"
              size="small"
              icon={<FlowRegular />}
              onClick={() =>
                onViewFlow(log.correlationid!, log.plugintracelogid)
              }
              title="View correlation flow diagram"
            >
              View flow
            </Button>
          )}
        </td>
        <td
          className={styles.tableCellTypeName}
          style={{
            width: `${typeNameWidth}px`,
            minWidth: `${typeNameWidth}px`,
            maxWidth: `${typeNameWidth}px`,
          }}
          title={log.typename}
        >
          {log.typename || "N/A"}
        </td>
        <td className={styles.tableCell}>{log.messagename || "N/A"}</td>
        <td className={styles.tableCell} title={log.primaryentity}>
          {log.primaryentity || "—"}
        </td>
        <td className={styles.tableCell}>{getModeLabel(log.mode)}</td>
        <td className={styles.tableCell}>
          {getOperationTypeLabel(log.operationtype)}
        </td>
        <td className={styles.tableCell}>{log.depth}</td>
        <td className={styles.tableCell}>
          <Badge
            appearance="filled"
            color={getDurationColor(log.performanceexecutionduration)}
          >
            {formatDuration(log.performanceexecutionduration)}
          </Badge>
        </td>
        <td className={styles.tableCell}>
          {log.exceptiondetails ? (
            <div className={styles.flexColumn}>
              <Badge color="danger">Yes</Badge>
              <Text className={styles.exceptionText}>
                {log.exceptiondetails}
              </Text>
            </div>
          ) : (
            "-"
          )}
        </td>
        <td className={styles.tableCell}>
          {new Date(log.createdon).toLocaleString()}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={11} className={styles.expandedRow}>
            <ResultsTableExpandedRow log={log} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default ResultsTableRow;
