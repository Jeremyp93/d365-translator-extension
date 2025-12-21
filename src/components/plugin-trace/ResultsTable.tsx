/**
 * ResultsTable - Sortable, expandable table for plugin trace logs
 * Features: column resizing, row expansion, sorting, responsive design
 */

import * as React from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Button,
  Badge,
  TableCellLayout,
  TableColumnId,
  createTableColumn,
  TableColumnDefinition,
} from '@fluentui/react-components';
import {
  ChevronRight20Regular,
  ChevronDown20Regular,
  FlowRegular,
} from '@fluentui/react-icons';
import {
  PluginTraceLog,
  formatDuration,
  getModeLabel,
  getOperationTypeLabel,
  getDurationColor,
} from '../../services/pluginTraceLogService';

const useStyles = makeStyles({
  tableContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.overflow('hidden'),
    width: '100%',
    overflowX: 'auto',
    '@media (max-width: 768px)': {
      overflowX: 'scroll',
      WebkitOverflowScrolling: 'touch',
    },
  },
  responsiveTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '1200px',
    '@media (min-width: 768px) and (max-width: 1024px)': {
      minWidth: '900px',
    },
    '@media (max-width: 767px)': {
      minWidth: '800px',
    },
  },
  resizableHeader: {
    position: 'relative' as const,
    userSelect: 'none' as const,
  },
  resizeHandle: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: '8px',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
      opacity: 0.5,
    },
  },
  resizing: {
    backgroundColor: tokens.colorBrandBackground,
    opacity: 0.7,
  },
  expandButton: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorBrandForeground1,
  },
  exceptionText: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  expandedContent: {
    ...shorthands.padding('16px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  traceBlock: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    maxHeight: '400px',
    overflowY: 'auto',
  },
  detailRow: {
    display: 'flex',
    ...shorthands.gap('8px'),
    marginBottom: '8px',
  },
  detailLabel: {
    fontWeight: tokens.fontWeightSemibold,
    minWidth: '150px',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  detailSection: {
    marginTop: '12px',
  },
  // Table header styles
  tableHeader: {
    ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  tableHeaderCell: {
    ...shorthands.padding('8px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
  },
  tableHeaderCellSortable: {
    ...shorthands.padding('8px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    cursor: 'pointer',
  },
  tableHeaderCellExpand: {
    width: '40px',
    ...shorthands.padding('8px'),
  },
  // Table row styles
  tableRow: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tableCell: {
    ...shorthands.padding('8px'),
  },
  tableCellCenter: {
    ...shorthands.padding('8px'),
    textAlign: 'center',
  },
  tableCellTypeName: {
    ...shorthands.padding('8px'),
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  expandedRow: {
    ...shorthands.padding(0),
    backgroundColor: tokens.colorNeutralBackground2,
  },
});

export interface ResultsTableProps {
  logs: PluginTraceLog[];
  onSortChange?: (sortColumn: TableColumnId | undefined, sortDirection: 'ascending' | 'descending') => void;
  onViewFlow?: (correlationId: string, rowId: string) => void;
  expandedRows: Set<string>;
  onToggleRow: (rowId: string) => void;
}

export interface ResultsTableHandle {
  resetSort: () => void;
}

const ResultsTable = React.forwardRef<ResultsTableHandle, ResultsTableProps>(
  ({ logs, onSortChange, onViewFlow, expandedRows, onToggleRow }, ref) => {
    const styles = useStyles();
    const [typeNameWidth, setTypeNameWidth] = React.useState<number>(350);
    const [isResizing, setIsResizing] = React.useState<boolean>(false);

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
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const columns: TableColumnDefinition<PluginTraceLog>[] = [
      createTableColumn<PluginTraceLog>({
        columnId: 'expand',
        renderHeaderCell: () => '',
        renderCell: (log) => {
          const hasDetails = !!(log.messageblock || log.exceptiondetails || log.correlationid);
          if (!hasDetails) return null;

          const isExpanded = expandedRows.has(log.plugintracelogid);
          return (
            <TableCellLayout>
              <div
                className={styles.expandButton}
                onClick={() => toggleRow(log.plugintracelogid)}
                role="button"
                tabIndex={0}
              >
                {isExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
              </div>
            </TableCellLayout>
          );
        },
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'actions',
        renderHeaderCell: () => 'Actions',
        renderCell: (log) => (
          <TableCellLayout>
            {log.correlationid && onViewFlow && (
              <Button
                appearance="subtle"
                size="small"
                icon={<FlowRegular />}
                onClick={() => onViewFlow(log.correlationid!, log.plugintracelogid)}
                title="View correlation flow diagram"
              >
                View flow
              </Button>
            )}
          </TableCellLayout>
        ),
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'typename',
        compare: (a, b) => (a.typename || '').localeCompare(b.typename || ''),
        renderHeaderCell: () => 'Type Name',
        renderCell: (log) => (
          <TableCellLayout truncate title={log.typename}>
            {log.typename || 'N/A'}
          </TableCellLayout>
        ),
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'messagename',
        compare: (a, b) => (a.messagename || '').localeCompare(b.messagename || ''),
        renderHeaderCell: () => 'Message',
        renderCell: (log) => <TableCellLayout>{log.messagename || 'N/A'}</TableCellLayout>,
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'mode',
        compare: (a, b) => a.mode - b.mode,
        renderHeaderCell: () => 'Mode',
        renderCell: (log) => <TableCellLayout>{getModeLabel(log.mode)}</TableCellLayout>,
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'operationtype',
        compare: (a, b) => a.operationtype - b.operationtype,
        renderHeaderCell: () => 'Type',
        renderCell: (log) => <TableCellLayout>{getOperationTypeLabel(log.operationtype)}</TableCellLayout>,
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'depth',
        compare: (a, b) => a.depth - b.depth,
        renderHeaderCell: () => 'Depth',
        renderCell: (log) => <TableCellLayout>{log.depth}</TableCellLayout>,
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'duration',
        compare: (a, b) => (a.performanceexecutionduration || 0) - (b.performanceexecutionduration || 0),
        renderHeaderCell: () => 'Duration',
        renderCell: (log) => {
          const color = getDurationColor(log.performanceexecutionduration);
          return (
            <TableCellLayout>
              <Badge appearance="filled" color={color}>
                {formatDuration(log.performanceexecutionduration)}
              </Badge>
            </TableCellLayout>
          );
        },
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'exception',
        compare: (a, b) => {
          const aHas = !!a.exceptiondetails;
          const bHas = !!b.exceptiondetails;
          return aHas === bHas ? 0 : aHas ? -1 : 1;
        },
        renderHeaderCell: () => 'Exception',
        renderCell: (log) => (
          <TableCellLayout truncate title={log.exceptiondetails}>
            {log.exceptiondetails ? (
              <div className={styles.flexColumn}>
                <Badge color="danger">Yes</Badge>
                <Text className={styles.exceptionText}>{log.exceptiondetails}</Text>
              </div>
            ) : (
              '-'
            )}
          </TableCellLayout>
        ),
      }),
      createTableColumn<PluginTraceLog>({
        columnId: 'createdon',
        compare: (a, b) => new Date(a.createdon).getTime() - new Date(b.createdon).getTime(),
        renderHeaderCell: () => 'Created On',
        renderCell: (log) => <TableCellLayout>{new Date(log.createdon).toLocaleString()}</TableCellLayout>,
      }),
    ];

    const [sortState, setSortState] = React.useState<{
      sortColumn: TableColumnId | undefined;
      sortDirection: 'ascending' | 'descending';
    }>({
      sortColumn: 'createdon',
      sortDirection: 'descending',
    });

    const sortedLogs = React.useMemo(() => {
      if (!sortState.sortColumn) return logs;

      const column = columns.find((col) => col.columnId === sortState.sortColumn);
      if (!column?.compare) return logs;

      const sorted = [...logs].sort(column.compare);
      return sortState.sortDirection === 'descending' ? sorted.reverse() : sorted;
    }, [logs, sortState, columns]);

    const handleSortChange = React.useCallback(
      (_: unknown, data: { sortColumn: TableColumnId | undefined; sortDirection: 'ascending' | 'descending' }) => {
        if (data.sortColumn) {
          setSortState({ sortColumn: data.sortColumn, sortDirection: data.sortDirection });
          onSortChange?.(data.sortColumn, data.sortDirection);
        }
      },
      [onSortChange]
    );

    const resetSort = React.useCallback(() => {
      setSortState({ sortColumn: 'createdon', sortDirection: 'descending' });
    }, []);

    React.useImperativeHandle(
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
              <th className={styles.tableHeaderCell} style={{ minWidth: '120px' }}>
                Actions
              </th>
              <th
                className={styles.resizableHeader}
                style={{
                  width: `${typeNameWidth}px`,
                  minWidth: `${typeNameWidth}px`,
                  maxWidth: `${typeNameWidth}px`,
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: tokens.fontWeightSemibold,
                  cursor: 'pointer',
                }}
                onClick={() =>
                  handleSortChange(null as any, {
                    sortColumn: 'typename',
                    sortDirection:
                      sortState.sortColumn === 'typename' && sortState.sortDirection === 'ascending'
                        ? 'descending'
                        : 'ascending',
                  })
                }
              >
                Type Name {sortState.sortColumn === 'typename' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
                <div
                  className={`${styles.resizeHandle} ${isResizing ? styles.resizing : ''}`}
                  onMouseDown={handleResizeStart}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
              <th
                className={styles.tableHeaderCellSortable}
                style={{ minWidth: '150px' }}
                onClick={() =>
                  handleSortChange(null as any, {
                    sortColumn: 'messagename',
                    sortDirection:
                      sortState.sortColumn === 'messagename' && sortState.sortDirection === 'ascending'
                        ? 'descending'
                        : 'ascending',
                  })
                }
              >
                Message {sortState.sortColumn === 'messagename' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} style={{ minWidth: '120px' }}>
                Mode
              </th>
              <th className={styles.tableHeaderCell} style={{ minWidth: '100px' }}>
                Type
              </th>
              <th className={styles.tableHeaderCell} style={{ minWidth: '80px' }}>
                Depth
              </th>
              <th
                className={styles.tableHeaderCellSortable}
                style={{ minWidth: '100px' }}
                onClick={() =>
                  handleSortChange(null as any, {
                    sortColumn: 'duration',
                    sortDirection:
                      sortState.sortColumn === 'duration' && sortState.sortDirection === 'ascending'
                        ? 'descending'
                        : 'ascending',
                  })
                }
              >
                Duration {sortState.sortColumn === 'duration' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} style={{ minWidth: '250px' }}>
                Exception
              </th>
              <th
                className={styles.tableHeaderCellSortable}
                style={{ minWidth: '180px' }}
                onClick={() =>
                  handleSortChange(null as any, {
                    sortColumn: 'createdon',
                    sortDirection:
                      sortState.sortColumn === 'createdon' && sortState.sortDirection === 'ascending'
                        ? 'descending'
                        : 'ascending',
                  })
                }
              >
                Created On {sortState.sortColumn === 'createdon' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log) => {
              const isExpanded = expandedRows.has(log.plugintracelogid);
              const hasDetails = !!(log.messageblock || log.exceptiondetails || log.correlationid);

              return (
                <React.Fragment key={log.plugintracelogid}>
                  <tr data-row-id={log.plugintracelogid} className={styles.tableRow}>
                    <td className={styles.tableCellCenter}>
                      {hasDetails && (
                        <div
                          className={styles.expandButton}
                          onClick={() => toggleRow(log.plugintracelogid)}
                          role="button"
                          tabIndex={0}
                        >
                          {isExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                        </div>
                      )}
                    </td>
                    <td className={styles.tableCellCenter}>
                      {log.correlationid && onViewFlow && (
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<FlowRegular />}
                          onClick={() => onViewFlow(log.correlationid!, log.plugintracelogid)}
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
                      {log.typename || 'N/A'}
                    </td>
                    <td className={styles.tableCell}>{log.messagename || 'N/A'}</td>
                    <td className={styles.tableCell}>{getModeLabel(log.mode)}</td>
                    <td className={styles.tableCell}>{getOperationTypeLabel(log.operationtype)}</td>
                    <td className={styles.tableCell}>{log.depth}</td>
                    <td className={styles.tableCell}>
                      <Badge appearance="filled" color={getDurationColor(log.performanceexecutionduration)}>
                        {formatDuration(log.performanceexecutionduration)}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      {log.exceptiondetails ? (
                        <div className={styles.flexColumn}>
                          <Badge color="danger">Yes</Badge>
                          <Text className={styles.exceptionText}>{log.exceptiondetails}</Text>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={styles.tableCell}>{new Date(log.createdon).toLocaleString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className={styles.expandedRow}>
                        <div className={styles.expandedContent}>
                          <div className={styles.detailRow}>
                            <Text className={styles.detailLabel}>Type Name:</Text>
                            <Text>{log.typename || 'N/A'}</Text>
                          </div>
                          <div className={styles.detailRow}>
                            <Text className={styles.detailLabel}>Message Name:</Text>
                            <Text>{log.messagename || 'N/A'}</Text>
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
                            <Badge appearance="filled" color={getDurationColor(log.performanceexecutionduration)}>
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
);

ResultsTable.displayName = 'ResultsTable';

export default ResultsTable;
