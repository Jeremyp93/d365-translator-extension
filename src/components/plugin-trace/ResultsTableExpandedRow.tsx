import { makeStyles, tokens, Text, Badge } from "@fluentui/react-components";

import {
  PluginTraceLog,
  formatDuration,
  getModeLabel,
  getOperationTypeLabel,
  getDurationColor,
} from "../../services/pluginTraceLogService";
import { spacing } from "../../styles/theme";

const useStyles = makeStyles({
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
  detailSection: {
    marginTop: spacing.md,
  },
});

interface ResultsTableExpandedRowProps {
  log: PluginTraceLog;
}

function ResultsTableExpandedRow({ log }: ResultsTableExpandedRowProps) {
  const styles = useStyles();

  return (
    <div className={styles.expandedContent}>
      <div className={styles.detailRow}>
        <Text className={styles.detailLabel}>Type Name:</Text>
        <Text>{log.typename || "N/A"}</Text>
      </div>
      <div className={styles.detailRow}>
        <Text className={styles.detailLabel}>Message Name:</Text>
        <Text>{log.messagename || "N/A"}</Text>
      </div>
      <div className={styles.detailRow}>
        <Text className={styles.detailLabel}>Execution Mode:</Text>
        <Text>{getModeLabel(log.mode)}</Text>
      </div>
      <div className={styles.detailRow}>
        <Text className={styles.detailLabel}>Operation Type:</Text>
        <Text>{getOperationTypeLabel(log.operationtype)}</Text>
      </div>
      <div className={styles.detailRow}>
        <Text className={styles.detailLabel}>Depth:</Text>
        <Text>{log.depth}</Text>
      </div>
      <div className={styles.detailRow}>
        <Text className={styles.detailLabel}>Duration:</Text>
        <Badge
          appearance="filled"
          color={getDurationColor(log.performanceexecutionduration)}
        >
          {formatDuration(log.performanceexecutionduration)}
        </Badge>
      </div>
      <div className={styles.detailRow}>
        <Text className={styles.detailLabel}>Created On:</Text>
        <Text>{new Date(log.createdon).toLocaleString()}</Text>
      </div>
      {log.correlationid && (
        <div className={styles.detailRow}>
          <Text className={styles.detailLabel}>Correlation ID:</Text>
          <Text>{log.correlationid}</Text>
        </div>
      )}
      {log.exceptiondetails && (
        <div className={styles.detailSection}>
          <Text className={styles.detailLabel}>Exception Details:</Text>
          <div className={styles.traceBlock}>{log.exceptiondetails}</div>
        </div>
      )}
      {log.messageblock && (
        <div className={styles.detailSection}>
          <Text className={styles.detailLabel}>Trace Log:</Text>
          <div className={styles.traceBlock}>{log.messageblock}</div>
        </div>
      )}
    </div>
  );
}

export default ResultsTableExpandedRow;
