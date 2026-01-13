import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { ChevronLeft20Regular, ChevronRight20Regular } from '@fluentui/react-icons';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  pageInfo: {
    minWidth: '150px',
    textAlign: 'center',
  },
});

interface AuditPaginationProps {
  currentPage: number;
  totalCount: number;
  hasMore: boolean;
  onNext: () => void;
  onPrev: () => void;
  disabled?: boolean;
}

export function AuditPagination({
  currentPage,
  totalCount,
  hasMore,
  onNext,
  onPrev,
  disabled = false,
}: AuditPaginationProps): JSX.Element {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Button
        appearance="subtle"
        icon={<ChevronLeft20Regular />}
        onClick={onPrev}
        disabled={disabled || currentPage === 1}
      >
        Previous
      </Button>

      <Text className={styles.pageInfo}>
        Page {currentPage}
        {totalCount > 0 && ` (${totalCount} total records)`}
      </Text>

      <Button
        appearance="subtle"
        icon={<ChevronRight20Regular />}
        iconPosition="after"
        onClick={onNext}
        disabled={disabled || !hasMore}
      >
        Next
      </Button>
    </div>
  );
}
