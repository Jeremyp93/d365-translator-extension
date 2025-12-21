/**
 * FilterSection - Server-side filter controls for plugin trace logs
 */

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
} from '@fluentui/react-components';
import { Settings20Regular, ArrowClockwiseRegular } from '@fluentui/react-icons';
import { PluginTraceLogFilters } from '../../services/pluginTraceLogService';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
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
  helpText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

export interface FilterSectionProps {
  filters: PluginTraceLogFilters;
  onFiltersChange: (filters: PluginTraceLogFilters) => void;
  onApply: () => void;
  onClear: () => void;
  loading: boolean;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export default function FilterSection({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  loading,
  pageSize,
  onPageSizeChange,
}: FilterSectionProps): JSX.Element {
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
      <Text className={styles.helpText}>
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
