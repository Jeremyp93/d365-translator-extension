import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  Button,
  Input,
  Checkbox,
  Spinner,
  TableColumnId,
} from "@fluentui/react-components";
import {
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  Search20Regular,
  Dismiss20Regular,
  DocumentText24Regular,
} from "@fluentui/react-icons";

import { useOrgContext } from "../../hooks/useOrgContext";
import { usePluginTraceLogs } from "../../hooks/usePluginTraceLogs";
import { useTheme } from "../../context/ThemeContext";
import PageHeader from "../../components/ui/PageHeader";
import FilterSection from "../../components/plugin-trace/FilterSection";
import ResultsTable, {
  ResultsTableHandle,
} from "../../components/plugin-trace/ResultsTable";
import { usePluginTraceLogPageStyles } from "./PluginTraceLogPage.styles";

const FlowSidePanel = lazy(
  () => import("../../components/plugin-trace/CorrelationFlowPanel")
);

export default function PluginTraceLogPage(): JSX.Element {
  const styles = usePluginTraceLogPageStyles();
  const { clientUrl, apiVersion } = useOrgContext();
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
  } = usePluginTraceLogs(clientUrl, apiVersion);
  const { mode, toggleTheme } = useTheme();

  // Ref to call resetSort on ResultsTable
  const resultsTableRef = useRef<ResultsTableHandle>(null);

  // Track current sort state to disable infinite scroll when sorting changes
  const [currentSort, setCurrentSort] = useState<{
    column?: TableColumnId;
    direction: "ascending" | "descending";
  }>({
    column: "createdon",
    direction: "descending",
  });

  // Manual control for infinite scroll
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] =
    useState<boolean>(true);

  const handleTableSortChange = useCallback(
    (
      column: TableColumnId | undefined,
      direction: "ascending" | "descending"
    ) => {
      setCurrentSort({ column, direction });
    },
    []
  );

  const handleResetSort = useCallback(() => {
    setCurrentSort({ column: "createdon", direction: "descending" });
    resultsTableRef.current?.resetSort();
  }, []);

  // Check if current sort matches server default (createdon descending)
  const isDefaultSort =
    currentSort.column === "createdon" &&
    currentSort.direction === "descending";

  // Correlation flow panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelCorrelationId, setPanelCorrelationId] = useState<string | null>(
    null
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Handle row toggle
  const handleToggleRow = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  // Infinite scroll implementation - only active when using default sort and enabled by user
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      document.title = 'Plugin Trace Logs - D365 Translator';
    }, []);

  useEffect(() => {
    if (!hasMore || isLoadingMore || !isDefaultSort || !infiniteScrollEnabled)
      return;
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          isDefaultSort &&
          infiniteScrollEnabled
        ) {
          loadMoreLogs();
        }
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);
    return () => {
      observer.disconnect();
    };
  }, [
    hasMore,
    isLoadingMore,
    loadMoreLogs,
    filteredLogs.length,
    isDefaultSort,
    infiniteScrollEnabled,
  ]); // Re-run when filteredLogs or sort changes

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
    },
    [setPageSize]
  );

  // Handle opening correlation flow panel
  const handleViewFlow = useCallback((correlationId: string, rowId: string) => {
    setPanelCorrelationId(correlationId);
    setSelectedRowId(rowId);
    setIsPanelOpen(true);
  }, []);

  // Handle closing panel
  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Handle node click in diagram - scroll to and expand row
  const handleNodeClick = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
    // Expand the row if not already expanded
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
    // Scroll to the row
    setTimeout(() => {
      const rowElement = document.querySelector(`[data-row-id="${rowId}"]`);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100); // Small delay to ensure row expansion state is updated
  }, []);

  if (!clientUrl) {
    return (
      <div className={styles.page}>
        <div className={styles.errorMessage}>
          <Text weight="semibold">Error loading organization context</Text>
          <Text>
            Could not determine organization URL from query parameters
          </Text>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <PageHeader
        title="Plugin Trace Logs"
        subtitle="View and analyze plugin execution traces with detailed filtering options"
        icon={<DocumentText24Regular />}
        connectionInfo={{ clientUrl, apiVersion }}
        actions={
          <Button
            appearance="subtle"
            icon={
              mode === "dark" ? (
                <WeatherSunny20Regular />
              ) : (
                <WeatherMoon20Regular />
              )
            }
            onClick={toggleTheme}
            title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
          />
        }
      />

      <div className={styles.content}>
        {/* Server Filters Section */}
        <section aria-label="Filter Section">
          <FilterSection
            filters={serverFilters}
            onFiltersChange={setServerFilters}
            onApply={applyServerFilters}
            onClear={clearServerFilters}
            loading={loading}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        </section>

        {/* Quick Search Section */}
        <section
          className={styles.quickSearchSection}
          aria-label="Quick Search"
        >
          <Text className={styles.quickSearchTitle}>
            <Search20Regular />
            Quick Search
          </Text>
          <Input
            placeholder="Search in results (Type Name, Message, Exception, Trace Log...)"
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
            contentAfter={
              searchQuery ? (
                <Dismiss20Regular
                  onClick={() => setSearchQuery("")}
                  className={styles.clickableIcon}
                />
              ) : (
                <Search20Regular />
              )
            }
          />
          <Text className={styles.quickSearchHelp}>
            Instantly filters loaded results • No server calls
          </Text>
        </section>

        <section className={styles.resultsSection} aria-label="Results">
          <div className={styles.resultsHeader}>
            <Text weight="semibold" size={500}>
              {searchQuery
                ? `Results (${filteredLogs.length} of ${serverLogs.length})`
                : `Results (Loaded ${filteredLogs.length}${
                    hasMore ? "+" : ""
                  } ${hasMore ? "" : "(all)"})`}
            </Text>
            <Checkbox
              label="Infinite scroll"
              checked={infiniteScrollEnabled}
              onChange={(_, data) =>
                setInfiniteScrollEnabled(data.checked === true)
              }
              disabled={!isDefaultSort || !!searchQuery}
            />
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

          {!loading &&
            !error &&
            filteredLogs.length === 0 &&
            serverLogs.length === 0 && (
              <Text>
                No plugin trace logs found matching the current server filters.
              </Text>
            )}

          {!loading &&
            !error &&
            filteredLogs.length === 0 &&
            serverLogs.length > 0 &&
            searchQuery && (
              <Text>
                No results match "{searchQuery}". Try a different search term or
                clear the search.
              </Text>
            )}

          {!loading &&
            !error &&
            filteredLogs.length > 0 &&
            !isDefaultSort &&
            hasMore && (
              <div className={styles.sortNotice}>
                <Text>
                  Infinite scroll is disabled when sorting. More records are
                  available on the server.
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

          {!loading && !error && filteredLogs.length > 0 && (
            <ResultsTable
              ref={resultsTableRef}
              logs={filteredLogs}
              onSortChange={handleTableSortChange}
              onViewFlow={handleViewFlow}
              expandedRows={expandedRows}
              onToggleRow={handleToggleRow}
            />
          )}

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
        </section>
      </div>

      {/* Correlation Flow Panel */}
      <Suspense fallback={<Spinner label="Loading panel..." />}>
        <FlowSidePanel
          isOpen={isPanelOpen}
          correlationId={panelCorrelationId}
          selectedRowId={selectedRowId}
          expandedRowIds={expandedRows}
          onClose={handleClosePanel}
          onNodeClick={handleNodeClick}
        />
      </Suspense>
    </main>
  );
}
