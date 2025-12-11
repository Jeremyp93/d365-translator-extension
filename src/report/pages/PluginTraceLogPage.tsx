import * as React from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Button,
  Input,
  Dropdown,
  Option,
  Checkbox,
  Spinner,
  Badge,
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  createTableColumn,
  TableColumnDefinition,
  TableCellLayout,
  TableColumnId,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, FilterRegular, WeatherMoon20Regular, WeatherSunny20Regular, ChevronRight20Regular, ChevronDown20Regular, Search20Regular, Settings20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { useOrgContext } from '../../hooks/useOrgContext';
import { usePluginTraceLogs } from '../../hooks/usePluginTraceLogs';
import { useTheme } from '../../context/ThemeContext';
import {
  PluginTraceLog,
  PluginTraceLogFilters,
  formatDuration,
  getModeLabel,
  getOperationTypeLabel,
  getDurationColor,
} from '../../services/pluginTraceLogService';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding('16px', '24px'),
    ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
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
  content: {
    flex: 1,
    ...shorthands.padding('24px'),
  },
  quickSearchSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('16px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginBottom: '16px',
  },
  quickSearchTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  quickSearchHelp: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    ...shorthands.padding('16px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    marginBottom: '24px',
  },
  filterTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    columnGap: '16px',
    rowGap: '16px',
    alignItems: 'end',
    '@media (max-width: 1200px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  filterActions: {
    display: 'flex',
    ...shorthands.gap('8px'),
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  resultsSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  tableContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.overflow('hidden'),
    width: '100%',
    // Responsive table handling
    overflowX: 'auto',
    '@media (max-width: 768px)': {
      // Mobile: horizontal scroll for full table
      overflowX: 'scroll',
      WebkitOverflowScrolling: 'touch',
    },
  },
  errorMessage: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.padding('48px'),
  },
  exceptionText: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  expandButton: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorBrandForeground1,
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
  responsiveTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '1200px', // Desktop: full width with all columns
    '@media (min-width: 768px) and (max-width: 1024px)': {
      // Tablet: slightly reduced min-width, flexible columns
      minWidth: '900px',
    },
    '@media (max-width: 767px)': {
      // Mobile: minimum table width, will scroll horizontally
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
  scrollSentinel: {
    height: '1px',
    width: '100%',
  },
  loadingMore: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.padding('24px'),
  },
});

interface FilterSectionProps {
  filters: PluginTraceLogFilters;
  onFiltersChange: (filters: PluginTraceLogFilters) => void;
  onApply: () => void;
  onClear: () => void;
  loading: boolean;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

function FilterSection({ filters, onFiltersChange, onApply, onClear, loading, pageSize, onPageSizeChange }: FilterSectionProps) {
  const styles = useStyles();

  const handleFilterChange = (field: keyof PluginTraceLogFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className={styles.filterSection}>
      <Text className={styles.filterTitle}>
        <Settings20Regular />
        Server Filters
      </Text>
      <Text style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 }}>
        Fetch filtered data from Dynamics 365 • Click Apply to execute
      </Text>

      <div className={styles.filterGrid}>
        <Input
          placeholder="Type Name (e.g., MyPlugin)"
          value={filters.typename || ''}
          onChange={(_, data) => handleFilterChange('typename', data.value)}
        />
        <Input
          placeholder="Message Name (e.g., Create)"
          value={filters.messagename || ''}
          onChange={(_, data) => handleFilterChange('messagename', data.value)}
        />
        <Dropdown
          placeholder="Execution Mode"
          value={
            filters.mode === 0
              ? 'Synchronous'
              : filters.mode === 1
              ? 'Asynchronous'
              : 'All'
          }
          onOptionSelect={(_, data) => {
            const mode =
              data.optionText === 'Synchronous'
                ? 0
                : data.optionText === 'Asynchronous'
                ? 1
                : -1;
            handleFilterChange('mode', mode === -1 ? undefined : mode);
          }}
        >
          <Option text="All">All</Option>
          <Option text="Synchronous">Synchronous</Option>
          <Option text="Asynchronous">Asynchronous</Option>
        </Dropdown>
        <Input
          type="number"
          placeholder="Min Duration (ms)"
          value={filters.minDuration?.toString() || ''}
          onChange={(_, data) =>
            handleFilterChange('minDuration', data.value ? parseFloat(data.value) : undefined)
          }
        />
        <Input
          type="number"
          placeholder="Max Duration (ms)"
          value={filters.maxDuration?.toString() || ''}
          onChange={(_, data) =>
            handleFilterChange('maxDuration', data.value ? parseFloat(data.value) : undefined)
          }
        />
        <Input
          type="date"
          placeholder="Start Date"
          value={filters.startDate || ''}
          onChange={(_, data) => handleFilterChange('startDate', data.value)}
        />
        <Input
          type="date"
          placeholder="End Date"
          value={filters.endDate || ''}
          onChange={(_, data) => handleFilterChange('endDate', data.value)}
        />
        <Checkbox
          label="Show only exceptions"
          checked={filters.hasException || false}
          onChange={(_, data) => handleFilterChange('hasException', data.checked)}
        />
        <Dropdown
          placeholder="Page Size"
          value={pageSize.toString()}
          selectedOptions={[pageSize.toString()]}
          onOptionSelect={(_, data) => {
            const size = parseInt(data.optionValue || '100', 10);
            onPageSizeChange(size);
          }}
        >
          <Option value="50">50 records</Option>
          <Option value="100">100 records (default)</Option>
          <Option value="200">200 records</Option>
          <Option value="500">500 records</Option>
          <Option value="1000">1000 records</Option>
        </Dropdown>
      </div>

      <div className={styles.filterActions}>
        <Button appearance="secondary" onClick={onClear}>
          Clear Filters
        </Button>
        <Button appearance="primary" icon={<ArrowClockwiseRegular />} onClick={onApply} disabled={loading}>
          {loading ? 'Applying...' : 'Apply Filters'}
        </Button>
      </div>
    </div>
  );
}

interface ResultsTableProps {
  logs: PluginTraceLog[];
  onSortChange?: (sortColumn: TableColumnId | undefined, sortDirection: 'ascending' | 'descending') => void;
}

interface ResultsTableHandle {
  resetSort: () => void;
}

const ResultsTable = React.forwardRef<ResultsTableHandle, ResultsTableProps>(({ logs, onSortChange }, ref) => {
  const styles = useStyles();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [typeNameWidth, setTypeNameWidth] = React.useState<number>(350);
  const [isResizing, setIsResizing] = React.useState<boolean>(false);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = typeNameWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(150, Math.min(800, startWidth + delta)); // Min 150px, max 800px
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
      renderCell: (log) => (
        <TableCellLayout>
          {log.messagename || 'N/A'}
        </TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: 'mode',
      compare: (a, b) => a.mode - b.mode,
      renderHeaderCell: () => 'Mode',
      renderCell: (log) => (
        <TableCellLayout>
          {getModeLabel(log.mode)}
        </TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: 'operationtype',
      compare: (a, b) => a.operationtype - b.operationtype,
      renderHeaderCell: () => 'Type',
      renderCell: (log) => (
        <TableCellLayout>
          {getOperationTypeLabel(log.operationtype)}
        </TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: 'depth',
      compare: (a, b) => a.depth - b.depth,
      renderHeaderCell: () => 'Depth',
      renderCell: (log) => (
        <TableCellLayout>
          {log.depth}
        </TableCellLayout>
      ),
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
      renderCell: (log) => (
        <TableCellLayout>
          {new Date(log.createdon).toLocaleString()}
        </TableCellLayout>
      ),
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

  React.useImperativeHandle(ref, () => ({
    resetSort
  }), [resetSort]);

  return (
    <div className={styles.tableContainer}>
      <table className={styles.responsiveTable}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.colorNeutralStroke1}`, backgroundColor: tokens.colorNeutralBackground2 }}>
            <th style={{ width: '40px', padding: '8px' }}></th>
            <th 
              className={styles.resizableHeader}
              style={{ 
                width: `${typeNameWidth}px`, 
                minWidth: `${typeNameWidth}px`,
                maxWidth: `${typeNameWidth}px`,
                padding: '8px', 
                textAlign: 'left', 
                fontWeight: tokens.fontWeightSemibold, 
                cursor: 'pointer' 
              }} 
              onClick={() => handleSortChange(null as any, { sortColumn: 'typename', sortDirection: sortState.sortColumn === 'typename' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}
            >
              Type Name {sortState.sortColumn === 'typename' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
              <div 
                className={`${styles.resizeHandle} ${isResizing ? styles.resizing : ''}`}
                onMouseDown={handleResizeStart}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            <th style={{ minWidth: '150px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold, cursor: 'pointer' }} onClick={() => handleSortChange(null as any, { sortColumn: 'messagename', sortDirection: sortState.sortColumn === 'messagename' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}>
              Message {sortState.sortColumn === 'messagename' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
            </th>
            <th style={{ minWidth: '120px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Mode</th>
            <th style={{ minWidth: '100px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Type</th>
            <th style={{ minWidth: '80px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Depth</th>
            <th style={{ minWidth: '100px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold, cursor: 'pointer' }} onClick={() => handleSortChange(null as any, { sortColumn: 'duration', sortDirection: sortState.sortColumn === 'duration' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}>
              Duration {sortState.sortColumn === 'duration' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
            </th>
            <th style={{ minWidth: '250px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Exception</th>
            <th style={{ minWidth: '180px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold, cursor: 'pointer' }} onClick={() => handleSortChange(null as any, { sortColumn: 'createdon', sortDirection: sortState.sortColumn === 'createdon' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}>
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
                <tr style={{ borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1 }}>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
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
                  <td style={{ 
                    padding: '8px', 
                    width: `${typeNameWidth}px`,
                    minWidth: `${typeNameWidth}px`,
                    maxWidth: `${typeNameWidth}px`,
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }} title={log.typename}>
                    {log.typename || 'N/A'}
                  </td>
                  <td style={{ padding: '8px' }}>{log.messagename || 'N/A'}</td>
                  <td style={{ padding: '8px' }}>{getModeLabel(log.mode)}</td>
                  <td style={{ padding: '8px' }}>{getOperationTypeLabel(log.operationtype)}</td>
                  <td style={{ padding: '8px' }}>{log.depth}</td>
                  <td style={{ padding: '8px' }}>
                    <Badge appearance="filled" color={getDurationColor(log.performanceexecutionduration)}>
                      {formatDuration(log.performanceexecutionduration)}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px' }}>
                    {log.exceptiondetails ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Badge color="danger">Yes</Badge>
                        <Text className={styles.exceptionText}>{log.exceptiondetails}</Text>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>{new Date(log.createdon).toLocaleString()}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={9} style={{ padding: 0, backgroundColor: tokens.colorNeutralBackground2 }}>
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
                          <div style={{ marginTop: '12px' }}>
                            <Text className={styles.detailLabel}>Exception Details:</Text>
                            <div className={styles.traceBlock}>{log.exceptiondetails}</div>
                          </div>
                        )}
                        {log.messageblock && (
                          <div style={{ marginTop: '12px' }}>
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
});

ResultsTable.displayName = 'ResultsTable';

export default function PluginTraceLogPage(): JSX.Element {
  const styles = useStyles();
  const { clientUrl } = useOrgContext();
  const {
    serverLogs,
    serverFilters,
    setServerFilters,
    applyServerFilters,
    clearServerFilters,
    pageSize,
    setPageSize,
    hasMore,
    isLoadingMore,
    loadMoreLogs,
    searchQuery,
    setSearchQuery,
    filteredLogs,
    loading,
    error,
  } = usePluginTraceLogs(clientUrl);
  const { theme, mode, toggleTheme } = useTheme();

  // Ref to call resetSort on ResultsTable
  const resultsTableRef = React.useRef<ResultsTableHandle>(null);

  // Track current sort state to disable infinite scroll when sorting changes
  const [currentSort, setCurrentSort] = React.useState<{ column?: TableColumnId; direction: 'ascending' | 'descending' }>({ 
    column: 'createdon', 
    direction: 'descending' 
  });

  const handleTableSortChange = React.useCallback((column: TableColumnId | undefined, direction: 'ascending' | 'descending') => {
    setCurrentSort({ column, direction });
  }, []);

  const handleResetSort = React.useCallback(() => {
    setCurrentSort({ column: 'createdon', direction: 'descending' });
    resultsTableRef.current?.resetSort();
  }, []);

  // Check if current sort matches server default (createdon descending)
  const isDefaultSort = currentSort.column === 'createdon' && currentSort.direction === 'descending';

  // Infinite scroll implementation - only active when using default sort
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasMore || isLoadingMore || !isDefaultSort) return;
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && isDefaultSort) {
          loadMoreLogs();
        }
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, loadMoreLogs, filteredLogs.length, isDefaultSort]); // Re-run when filteredLogs or sort changes

  const handlePageSizeChange = React.useCallback((size: number) => {
    setPageSize(size);
  }, [setPageSize]);

  if (!clientUrl) {
    return (
      <div className={styles.page}>
        <div className={styles.errorMessage}>
          <Text weight="semibold">Error loading organization context</Text>
          <Text>Could not determine organization URL from query parameters</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Text className={styles.title}>Plugin Trace Logs</Text>
          <Text className={styles.subtitle}>
            View and analyze plugin execution traces with detailed filtering options
          </Text>
        </div>
        <Button
          appearance="subtle"
          icon={mode === 'dark' ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
          onClick={toggleTheme}
          title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        />
      </div>

      <div className={styles.content}>
        {/* Server Filters Section */}
        <FilterSection
          filters={serverFilters}
          onFiltersChange={setServerFilters}
          onApply={applyServerFilters}
          onClear={clearServerFilters}
          loading={loading}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />

        {/* Quick Search Section */}
        <div className={styles.quickSearchSection}>
          <Text className={styles.quickSearchTitle}>
            <Search20Regular />
            Quick Search
          </Text>
          <Input
            placeholder="Search in results (Type Name, Message, Exception, Trace Log...)"
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
            contentAfter={searchQuery ? <Dismiss20Regular onClick={() => setSearchQuery('')} style={{ cursor: 'pointer' }} /> : <Search20Regular />}
          />
          <Text className={styles.quickSearchHelp}>
            Instantly filters loaded results • No server calls
          </Text>
        </div>

        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <Text weight="semibold" size={500}>
              {searchQuery ? (
                `Results (${filteredLogs.length} of ${serverLogs.length})`
              ) : (
                `Results (Loaded ${filteredLogs.length}${hasMore ? '+' : ''} ${hasMore ? '' : '(all)'})`
              )}
            </Text>
          </div>

          {loading && (
            <div className={styles.loadingContainer}>
              <Spinner label="Loading plugin trace logs..." />
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <Text weight="semibold">Error loading trace logs</Text>
              <Text>{error}</Text>
            </div>
          )}

          {!loading && !error && filteredLogs.length === 0 && serverLogs.length === 0 && (
            <Text>No plugin trace logs found matching the current server filters.</Text>
          )}

          {!loading && !error && filteredLogs.length === 0 && serverLogs.length > 0 && searchQuery && (
            <Text>No results match "{searchQuery}". Try a different search term or clear the search.</Text>
          )}

          {!loading && !error && filteredLogs.length > 0 && !isDefaultSort && hasMore && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '12px',
              backgroundColor: tokens.colorNeutralBackground2,
              borderRadius: tokens.borderRadiusMedium,
              border: `1px solid ${tokens.colorNeutralStroke1}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <Text>
                Infinite scroll is disabled when sorting. More records are available on the server.
              </Text>
              <Button
                appearance="primary"
                size="small"
                onClick={handleResetSort}
              >
                Reset to Default Sort
              </Button>
            </div>
          )}

          {!loading && !error && filteredLogs.length > 0 && <ResultsTable ref={resultsTableRef} logs={filteredLogs} onSortChange={handleTableSortChange} />}

          {/* Infinite scroll sentinel */}
          {!loading && !error && filteredLogs.length > 0 && hasMore && (
            <div ref={sentinelRef} className={styles.scrollSentinel} />
          )}

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className={styles.loadingMore}>
              <Spinner label="Loading more logs..." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
