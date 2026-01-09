import {
  FluentProvider,
  Button,
  Text,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  History24Regular,
} from '@fluentui/react-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuditContext } from '../hooks/useAuditContext';
import { useAuditHistory } from '../hooks/useAuditHistory';
import PageHeader from '../components/ui/PageHeader';
import { AuditTable } from './components/AuditTable';
import { AuditPagination } from './components/AuditPagination';
import { DisplayNamesToggle } from './components/DisplayNamesToggle';
import { spacing } from '../styles/theme';

const useStyles = makeStyles({
  container: {
    minHeight: '100vh',
    minWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: spacing.md,
  },
  errorContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: spacing.md,
    padding: spacing.lg,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteRedForeground1,
  },
  errorMessage: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  toolbarContainer: {
    padding: spacing.md,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: spacing.md,
  },
});

export function AuditHistoryApp(): JSX.Element {
  const styles = useStyles();
  const { theme, mode, toggleTheme } = useTheme();
  const { context, loading: contextLoading, error: contextError } = useAuditContext();

  const {
    records,
    loading,
    error,
    currentPage,
    totalCount,
    hasMore,
    showDisplayNames,
    displayNamesMap,
    displayNamesLoading,
    nextPage,
    prevPage,
    refresh,
    toggleDisplayNames,
  } = useAuditHistory(
    context?.clientUrl || '',
    context?.entityLogicalName || '',
    context?.recordId || '',
    context?.apiVersion || 'v9.2'
  );

  return (
    <FluentProvider theme={theme} className={styles.container}>
      {/* Page Header with theme toggle */}
      <PageHeader
        title="Audit History"
        subtitle={
          context
            ? `${context.entityLogicalName} - ${context.recordId}`
            : 'Loading context...'
        }
        icon={<History24Regular />}
        actions={
          <Button
            appearance="subtle"
            icon={
              mode === 'dark' ? (
                <WeatherSunny20Regular />
              ) : (
                <WeatherMoon20Regular />
              )
            }
            onClick={toggleTheme}
          />
        }
      />

      {/* Loading state for context */}
      {contextLoading && (
        <div className={styles.loadingContainer}>
          <Spinner size="large" label="Loading audit context..." />
        </div>
      )}

      {/* Error state for context */}
      {contextError && (
        <div className={styles.errorContainer}>
          <Text className={styles.errorTitle}>Failed to load context</Text>
          <Text className={styles.errorMessage}>{contextError}</Text>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      )}

      {/* Main content - only show if context is loaded */}
      {!contextLoading && !contextError && context && (
        <>
          {/* Toolbar with display names toggle */}
          <div className={styles.toolbarContainer}>
            <DisplayNamesToggle
              checked={showDisplayNames}
              loading={displayNamesLoading}
              onChange={toggleDisplayNames}
              disabled={loading}
            />
            <Button appearance="subtle" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>

          {/* Error state for audit history */}
          {error && (
            <div className={styles.errorContainer}>
              <Text className={styles.errorTitle}>Failed to load audit history</Text>
              <Text className={styles.errorMessage}>{error}</Text>
              <Button onClick={refresh}>Retry</Button>
            </div>
          )}

          {/* Audit table */}
          {!error && (
            <div className={styles.content}>
              <div className={styles.tableContainer}>
                <AuditTable
                  records={records}
                  loading={loading}
                  showDisplayNames={showDisplayNames}
                  displayNamesMap={displayNamesMap}
                />
              </div>

              {/* Pagination */}
              {!loading && records.length > 0 && (
                <AuditPagination
                  currentPage={currentPage}
                  totalCount={totalCount}
                  hasMore={hasMore}
                  onNext={nextPage}
                  onPrev={prevPage}
                  disabled={loading}
                />
              )}
            </div>
          )}
        </>
      )}
    </FluentProvider>
  );
}
