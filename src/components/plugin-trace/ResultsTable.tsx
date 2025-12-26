/**
 * ResultsTable - Sortable, expandable table for plugin trace logs
 * Features: column resizing, row expansion, sorting, responsive design
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  makeStyles,
  tokens,
  TableColumnId,
} from "@fluentui/react-components";

import { PluginTraceLog } from "../../services/pluginTraceLogService";
import { createResultsTableColumns } from "./ResultsTableColumns";
import ResultsTableRow from "./ResultsTableRow";
import { spacing } from "../../styles/theme";

const useStyles = makeStyles({
  tableContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    overflow: "hidden",
    width: "100%",
    overflowX: "auto",
    "@media (max-width: 768px)": {
      overflowX: "scroll",
      WebkitOverflowScrolling: "touch",
    },
  },
  responsiveTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: "1200px",
    "@media (min-width: 768px) and (max-width: 1024px)": {
      minWidth: "900px",
    },
    "@media (max-width: 767px)": {
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
    width: "8px",
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
  // Table header styles
  tableHeader: {
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  tableHeaderCell: {
    padding: spacing.sm,
    textAlign: "left",
    fontWeight: tokens.fontWeightSemibold,
  },
  tableHeaderCellSortable: {
    padding: spacing.sm,
    textAlign: "left",
    fontWeight: tokens.fontWeightSemibold,
    cursor: "pointer",
  },
  tableHeaderCellExpand: {
    width: "40px",
    padding: spacing.sm,
  },
  // Column header min widths
  headerActions: {
    minWidth: "120px",
  },
  headerMessageName: {
    minWidth: "150px",
  },
  headerMode: {
    minWidth: "120px",
  },
  headerType: {
    minWidth: "100px",
  },
  headerDepth: {
    minWidth: "80px",
  },
  headerDuration: {
    minWidth: "100px",
  },
  headerException: {
    minWidth: "250px",
  },
  headerCreatedOn: {
    minWidth: "180px",
  },
});

export interface ResultsTableProps {
  logs: PluginTraceLog[];
  onSortChange?: (
    sortColumn: TableColumnId | undefined,
    sortDirection: "ascending" | "descending"
  ) => void;
  onViewFlow?: (correlationId: string, rowId: string) => void;
  expandedRows: Set<string>;
  onToggleRow: (rowId: string) => void;
}

export interface ResultsTableHandle {
  resetSort: () => void;
}

const ResultsTable = forwardRef<ResultsTableHandle, ResultsTableProps>(
  ({ logs, onSortChange, onViewFlow, expandedRows, onToggleRow }, ref) => {
    const styles = useStyles();
    const [typeNameWidth, setTypeNameWidth] = useState<number>(350);
    const [isResizing, setIsResizing] = useState<boolean>(false);

    const toggleRow = onToggleRow;

    const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = typeNameWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(150, Math.min(800, startWidth + delta));
        setTypeNameWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const columns = useMemo(
      () => createResultsTableColumns(expandedRows, toggleRow, onViewFlow),
      [expandedRows, toggleRow, onViewFlow]
    );

    const [sortState, setSortState] = useState<{
      sortColumn: TableColumnId | undefined;
      sortDirection: "ascending" | "descending";
    }>({
      sortColumn: "createdon",
      sortDirection: "descending",
    });

    const sortedLogs = useMemo(() => {
      if (!sortState.sortColumn) return logs;

      const column = columns.find(
        (col) => col.columnId === sortState.sortColumn
      );
      if (!column?.compare) return logs;

      const sorted = [...logs].sort(column.compare);
      return sortState.sortDirection === "descending"
        ? sorted.reverse()
        : sorted;
    }, [logs, sortState, columns]);

    const handleSortChange = useCallback(
      (data: { sortColumn: TableColumnId | undefined; sortDirection: 'ascending' | 'descending' }) => {
        if (data.sortColumn) {
          setSortState({ sortColumn: data.sortColumn, sortDirection: data.sortDirection });
          onSortChange?.(data.sortColumn, data.sortDirection);
        }
      },
      [onSortChange]
    );

    const resetSort = useCallback(() => {
      setSortState({ sortColumn: "createdon", sortDirection: "descending" });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        resetSort,
      }),
      [resetSort]
    );

    return (
      <div className={styles.tableContainer}>
        <table className={styles.responsiveTable}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.tableHeaderCellExpand}></th>
              <th
                className={`${styles.tableHeaderCell} ${styles.headerActions}`}
              >
                Actions
              </th>
              <th
                className={styles.resizableHeader}
                style={{
                  width: `${typeNameWidth}px`,
                  minWidth: `${typeNameWidth}px`,
                  maxWidth: `${typeNameWidth}px`,
                  padding: "8px",
                  textAlign: "left",
                  fontWeight: tokens.fontWeightSemibold,
                  cursor: "pointer",
                }}
                onClick={() =>
                  handleSortChange({
                    sortColumn: "typename",
                    sortDirection:
                      sortState.sortColumn === "typename" &&
                      sortState.sortDirection === "ascending"
                        ? "descending"
                        : "ascending",
                  })
                }
              >
                Type Name{" "}
                {sortState.sortColumn === "typename" &&
                  (sortState.sortDirection === "ascending" ? "↑" : "↓")}
                <div
                  className={`${styles.resizeHandle} ${
                    isResizing ? styles.resizing : ""
                  }`}
                  onMouseDown={handleResizeStart}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
              <th
                className={`${styles.tableHeaderCellSortable} ${styles.headerMessageName}`}
                onClick={() =>
                  handleSortChange({
                    sortColumn: "messagename",
                    sortDirection:
                      sortState.sortColumn === "messagename" &&
                      sortState.sortDirection === "ascending"
                        ? "descending"
                        : "ascending",
                  })
                }
              >
                Message{" "}
                {sortState.sortColumn === "messagename" &&
                  (sortState.sortDirection === "ascending" ? "↑" : "↓")}
              </th>
              <th
                className={`${styles.tableHeaderCell} ${styles.headerMode}`}
              >
                Mode
              </th>
              <th
                className={`${styles.tableHeaderCell} ${styles.headerType}`}
              >
                Type
              </th>
              <th
                className={`${styles.tableHeaderCell} ${styles.headerDepth}`}
              >
                Depth
              </th>
              <th
                className={`${styles.tableHeaderCellSortable} ${styles.headerDuration}`}
                onClick={() =>
                  handleSortChange({
                    sortColumn: "duration",
                    sortDirection:
                      sortState.sortColumn === "duration" &&
                      sortState.sortDirection === "ascending"
                        ? "descending"
                        : "ascending",
                  })
                }
              >
                Duration{" "}
                {sortState.sortColumn === "duration" &&
                  (sortState.sortDirection === "ascending" ? "↑" : "↓")}
              </th>
              <th
                className={`${styles.tableHeaderCell} ${styles.headerException}`}
              >
                Exception
              </th>
              <th
                className={`${styles.tableHeaderCellSortable} ${styles.headerCreatedOn}`}
                onClick={() =>
                  handleSortChange({
                    sortColumn: "createdon",
                    sortDirection:
                      sortState.sortColumn === "createdon" &&
                      sortState.sortDirection === "ascending"
                        ? "descending"
                        : "ascending",
                  })
                }
              >
                Created On{" "}
                {sortState.sortColumn === "createdon" &&
                  (sortState.sortDirection === "ascending" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log) => {
              const isExpanded = expandedRows.has(log.plugintracelogid);
              return (
                <ResultsTableRow
                  key={log.plugintracelogid}
                  log={log}
                  isExpanded={isExpanded}
                  typeNameWidth={typeNameWidth}
                  onToggleRow={toggleRow}
                  onViewFlow={onViewFlow}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
);

ResultsTable.displayName = "ResultsTable";

export default ResultsTable;
