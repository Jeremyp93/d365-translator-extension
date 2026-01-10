import {
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
import { spacing, borderRadius } from '../../styles/theme';

const useStyles = makeStyles({
  cardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    padding: spacing.md,
  },
  auditCard: {
    padding: spacing.lg,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.colorNeutralBackground1,
    transition: 'box-shadow 0.2s ease',
    ':hover': {
      boxShadow: tokens.shadow8,
    },
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexWrap: 'wrap',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  fieldChange: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  fieldLabel: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  valueChange: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
  },
  beforeValue: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: borderRadius.sm,
  },
  afterValue: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: borderRadius.sm,
  },
  arrow: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
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
      <div className={styles.cardsContainer}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.auditCard}>
            <div className={styles.cardHeader}>
              <Skeleton>
                <SkeletonItem style={{ width: '80px' }} />
              </Skeleton>
              <Skeleton>
                <SkeletonItem style={{ width: '200px' }} />
              </Skeleton>
              <Skeleton>
                <SkeletonItem style={{ width: '150px' }} />
              </Skeleton>
            </div>
            <div className={styles.cardBody}>
              <Skeleton>
                <SkeletonItem />
              </Skeleton>
              <Skeleton>
                <SkeletonItem />
              </Skeleton>
            </div>
          </div>
        ))}
      </div>
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
    <div className={styles.cardsContainer}>
      {records.map((record) => (
        <div key={record.auditId} className={styles.auditCard}>
          {/* Card Header */}
          <div className={styles.cardHeader}>
            <Badge appearance={getBadgeAppearance(record.operation)}>
              {record.operation}
            </Badge>
            <Text size={300} weight="semibold">
              {record.userName
                ? `${record.userName} (${record.userId})`
                : record.userId}
            </Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {formatDate(record.createdOn)}
            </Text>
          </div>

          {/* Card Body - Changed Fields */}
          <div className={styles.cardBody}>
            {record.changedFields.length === 0 ? (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                (No field changes recorded)
              </Text>
            ) : (
              record.changedFields.map((field, idx) => (
                <div key={idx} className={styles.fieldChange}>
                  <Text className={styles.fieldLabel}>
                    {getFieldLabel(field.fieldName)}
                  </Text>
                  <div className={styles.valueChange}>
                    <div className={styles.beforeValue}>
                      <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                        Before:
                      </Text>
                      <Text size={200}>
                        {formatAuditValue(field.oldValue)}
                      </Text>
                    </div>
                    <div className={styles.arrow}>→</div>
                    <div className={styles.afterValue}>
                      <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                        After:
                      </Text>
                      <Text size={200}>
                        {formatAuditValue(field.newValue)}
                      </Text>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
