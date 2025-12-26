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
import { spacing } from "../../styles/theme";

const useStyles = makeStyles({
  tableRow: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
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
});

interface ResultsTableRowProps {
  log: PluginTraceLog;
  isExpanded: boolean;
  typeNameWidth: number;
  onToggleRow: (rowId: string) => void;
  onViewFlow?: (correlationId: string, rowId: string) => void;
}

function ResultsTableRow({
  log,
  isExpanded,
  typeNameWidth,
  onToggleRow,
  onViewFlow,
}: ResultsTableRowProps) {
  const styles = useStyles();

  const hasDetails = !!(
    log.messageblock ||
    log.exceptiondetails ||
    log.correlationid
  );

  return (
    <Fragment>
      <tr data-row-id={log.plugintracelogid} className={styles.tableRow}>
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
          <td colSpan={10} className={styles.expandedRow}>
            <ResultsTableExpandedRow log={log} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default ResultsTableRow;
