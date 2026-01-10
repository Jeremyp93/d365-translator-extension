import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Text,
  Skeleton,
  SkeletonItem,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArchiveRegular } from '@fluentui/react-icons';
import type { ParsedAuditRecord, DisplayNamesMap } from '../../types/audit';
import { formatAuditValue } from '../../services/auditHistoryService';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  table: {
    width: '100%',
  },
  emptyState: {
    textAlign: 'center',
    padding: `${spacing.xxl} ${spacing.lg}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: '48px',
    color: tokens.colorNeutralForeground3,
  },
  emptyTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
  },
  emptyMessage: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
  },
  changedField: {
    display: 'block',
    marginBottom: spacing.xs,
  },
  fieldName: {
    fontWeight: tokens.fontWeightSemibold,
  },
  arrow: {
    color: tokens.colorNeutralForeground3,
    margin: `0 ${spacing.xs}`,
  },
});

interface AuditTableProps {
  records: ParsedAuditRecord[];
  loading: boolean;
  showDisplayNames: boolean;
  displayNamesMap: DisplayNamesMap;
}

export function AuditTable({
  records,
  loading,
  showDisplayNames,
  displayNamesMap,
}: AuditTableProps): JSX.Element {
  const styles = useStyles();

  // Format date based on user's locale
  const formatDate = (date: Date): string => {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get display name or schema name for a field
  const getFieldLabel = (fieldName: string): string => {
    if (showDisplayNames && displayNamesMap[fieldName]) {
      return displayNamesMap[fieldName];
    }
    return fieldName;
  };

  // Get badge appearance based on operation type
  const getBadgeAppearance = (
    operation: string
  ): 'success' | 'warning' | 'danger' => {
    if (operation === 'Create') return 'success';
    if (operation === 'Delete') return 'danger';
    return 'warning';
  };

  if (loading) {
    return (
      <Table className={styles.table}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Created On</TableHeaderCell>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>Changed Fields</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton>
                  <SkeletonItem />
                </Skeleton>
              </TableCell>
              <TableCell>
                <Skeleton>
                  <SkeletonItem />
                </Skeleton>
              </TableCell>
              <TableCell>
                <Skeleton>
                  <SkeletonItem />
                </Skeleton>
              </TableCell>
              <TableCell>
                <Skeleton>
                  <SkeletonItem />
                </Skeleton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (records.length === 0) {
    return (
      <div className={styles.emptyState}>
        <ArchiveRegular className={styles.emptyIcon} />
        <Text className={styles.emptyTitle}>No audit history available</Text>
        <Text className={styles.emptyMessage}>
          Auditing may not be enabled for this entity.
        </Text>
      </div>
    );
  }

  return (
    <Table className={styles.table}>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Created On</TableHeaderCell>
          <TableHeaderCell>User</TableHeaderCell>
          <TableHeaderCell>Action</TableHeaderCell>
          <TableHeaderCell>Changed Fields</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.auditId}>
            <TableCell>{formatDate(record.createdOn)}</TableCell>
            <TableCell>
              <Text size={200}>
                {record.userName
                  ? `${record.userName} (${record.userId})`
                  : record.userId
                }
              </Text>
            </TableCell>
            <TableCell>
              <Badge appearance={getBadgeAppearance(record.operation)}>
                {record.operation}
              </Badge>
            </TableCell>
            <TableCell>
              {record.changedFields.length === 0 ? (
                <Text size={200}>(No field changes recorded)</Text>
              ) : (
                record.changedFields.map((field, idx) => (
                  <div key={idx} className={styles.changedField}>
                    <Text className={styles.fieldName}>
                      {getFieldLabel(field.fieldName)}:
                    </Text>
                    <Text size={200}>
                      {formatAuditValue(field.oldValue)}
                      <span className={styles.arrow}>→</span>
                      {formatAuditValue(field.newValue)}
                    </Text>
                  </div>
                ))
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
