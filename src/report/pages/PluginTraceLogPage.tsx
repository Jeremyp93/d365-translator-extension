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
import { ArrowClockwiseRegular, FilterRegular, WeatherMoon20Regular, WeatherSunny20Regular, ChevronRight20Regular, ChevronDown20Regular } from '@fluentui/react-icons';
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
    height: '100vh',
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
    overflowY: 'auto',
    ...shorthands.padding('24px'),
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    ...shorthands.gap('12px'),
    alignItems: 'end',
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
});

interface FilterSectionProps {
  filters: PluginTraceLogFilters;
  onFiltersChange: (filters: PluginTraceLogFilters) => void;
  onRefresh: () => void;
  loading: boolean;
}

function FilterSection({ filters, onFiltersChange, onRefresh, loading }: FilterSectionProps) {
  const styles = useStyles();

  const handleFilterChange = (field: keyof PluginTraceLogFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className={styles.filterSection}>
      <Text className={styles.filterTitle}>
        <FilterRegular />
        Filter Options
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
      </div>

      <div className={styles.filterActions}>
        <Button appearance="secondary" onClick={handleClearFilters}>
          Clear Filters
        </Button>
        <Button appearance="primary" icon={<ArrowClockwiseRegular />} onClick={onRefresh} disabled={loading}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

interface ResultsTableProps {
  logs: PluginTraceLog[];
}

function ResultsTable({ logs }: ResultsTableProps) {
  const styles = useStyles();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

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

  const onSortChange = React.useCallback(
    (_: unknown, data: { sortColumn: TableColumnId | undefined; sortDirection: 'ascending' | 'descending' }) => {
      if (data.sortColumn) {
        setSortState({ sortColumn: data.sortColumn, sortDirection: data.sortDirection });
      }
    },
    []
  );

  return (
    <div className={styles.tableContainer}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.colorNeutralStroke1}`, backgroundColor: tokens.colorNeutralBackground2 }}>
            <th style={{ width: '40px', padding: '8px' }}></th>
            <th style={{ minWidth: '350px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold, cursor: 'pointer' }} onClick={() => onSortChange(null as any, { sortColumn: 'typename', sortDirection: sortState.sortColumn === 'typename' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}>
              Type Name {sortState.sortColumn === 'typename' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
            </th>
            <th style={{ minWidth: '150px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold, cursor: 'pointer' }} onClick={() => onSortChange(null as any, { sortColumn: 'messagename', sortDirection: sortState.sortColumn === 'messagename' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}>
              Message {sortState.sortColumn === 'messagename' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
            </th>
            <th style={{ minWidth: '120px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Mode</th>
            <th style={{ minWidth: '100px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Type</th>
            <th style={{ minWidth: '80px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Depth</th>
            <th style={{ minWidth: '100px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold, cursor: 'pointer' }} onClick={() => onSortChange(null as any, { sortColumn: 'duration', sortDirection: sortState.sortColumn === 'duration' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}>
              Duration {sortState.sortColumn === 'duration' && (sortState.sortDirection === 'ascending' ? '↑' : '↓')}
            </th>
            <th style={{ minWidth: '250px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold }}>Exception</th>
            <th style={{ minWidth: '180px', padding: '8px', textAlign: 'left', fontWeight: tokens.fontWeightSemibold, cursor: 'pointer' }} onClick={() => onSortChange(null as any, { sortColumn: 'createdon', sortDirection: sortState.sortColumn === 'createdon' && sortState.sortDirection === 'ascending' ? 'descending' : 'ascending' })}>
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
                  <td style={{ padding: '8px', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.typename}>
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
}

export default function PluginTraceLogPage(): JSX.Element {
  const styles = useStyles();
  const { clientUrl } = useOrgContext();
  const { logs, loading, error, filters, setFilters, refetch } = usePluginTraceLogs(clientUrl);
  const { theme, mode, toggleTheme } = useTheme();

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
        <FilterSection
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={refetch}
          loading={loading}
        />

        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <Text weight="semibold" size={500}>
              Results ({logs.length})
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

          {!loading && !error && logs.length === 0 && (
            <Text>No plugin trace logs found matching the current filters.</Text>
          )}

          {!loading && !error && logs.length > 0 && <ResultsTable logs={logs} />}
        </div>
      </div>
    </div>
  );
}
