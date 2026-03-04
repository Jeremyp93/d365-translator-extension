import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getPluginTraceLogs,
  getNextPageOfLogs,
  PluginTraceLog,
  PluginTraceLogFilters,
} from '../services/pluginTraceLogService';

interface UsePluginTraceLogsResult {
  // Server state
  serverLogs: PluginTraceLog[];
  serverFilters: PluginTraceLogFilters;
  setServerFilters: (filters: PluginTraceLogFilters) => void;
  applyServerFilters: () => Promise<void>;
  clearServerFilters: () => void;
  
  // Pagination state
  pageSize: number;
  setPageSize: (size: number) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreLogs: () => Promise<void>;
  
  // Client state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Combined result
  filteredLogs: PluginTraceLog[];

  // Grouping
  groupByCorrelation: boolean;
  toggleGroupByCorrelation: () => void;
  displayLogs: PluginTraceLog[];

  // Status
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing plugin trace logs with dual filtering:
 * - Quick search: client-side instant filtering of loaded results
 * - Server filters: API-based filtering with explicit apply
 * - Pagination: server-side pagination with infinite scroll support
 */
export function usePluginTraceLogs(baseUrl: string, apiVersion: string = 'v9.2'): UsePluginTraceLogsResult {
  const [serverLogs, setServerLogs] = useState<PluginTraceLog[]>([]);
  const [serverFilters, setServerFilters] = useState<PluginTraceLogFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<PluginTraceLogFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [pageSize, setPageSizeState] = useState(100);
  const [nextLink, setNextLink] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch from server (only when called explicitly)
  const fetchLogs = useCallback(async () => {
    if (!baseUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getPluginTraceLogs(baseUrl, appliedFilters, pageSize, apiVersion);
      setServerLogs(response.records);
      setNextLink(response.nextLink);
      setHasMore(response.nextLink !== null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugin trace logs';
      setError(errorMessage);
      setServerLogs([]);
      setNextLink(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, appliedFilters, pageSize, apiVersion]);

  // Initial load on mount only
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]); // Only refetch when baseUrl changes

  // Load more logs (infinite scroll)
  const loadMoreLogs = useCallback(async () => {
    // Block loading more when local filtering is active
    if (searchQuery.trim()) return;
    
    if (!nextLink || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await getNextPageOfLogs(nextLink, pageSize);
      setServerLogs(prev => [...prev, ...response.records]);
      setNextLink(response.nextLink);
      setHasMore(response.nextLink !== null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more logs';
      setError(errorMessage);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextLink, isLoadingMore, hasMore, pageSize, searchQuery]);

  // Client-side filtering (memoized for performance)
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return serverLogs;
    
    const query = searchQuery.toLowerCase();
    return serverLogs.filter(log => 
      log.typename?.toLowerCase().includes(query) ||
      log.messagename?.toLowerCase().includes(query) ||
      log.exceptiondetails?.toLowerCase().includes(query) ||
      log.messageblock?.toLowerCase().includes(query)
    );
  }, [serverLogs, searchQuery]);

  // Correlation grouping
  const [groupByCorrelation, setGroupByCorrelation] = useState(false);

  const toggleGroupByCorrelation = useCallback(() => {
    setGroupByCorrelation(prev => !prev);
  }, []);

  /**
   * When grouping is active, reorder logs:
   * 1. Group by correlationId
   * 2. Within each group: sort by createdon ascending
   * 3. Groups ordered by earliest createdon descending
   * 4. Logs without correlationId go to the end
   */
  const displayLogs = useMemo(() => {
    if (!groupByCorrelation) return filteredLogs;

    const grouped = new Map<string, PluginTraceLog[]>();
    const ungrouped: PluginTraceLog[] = [];

    for (const log of filteredLogs) {
      if (log.correlationid) {
        const group = grouped.get(log.correlationid);
        if (group) {
          group.push(log);
        } else {
          grouped.set(log.correlationid, [log]);
        }
      } else {
        ungrouped.push(log);
      }
    }

    // Sort within each group by createdon ascending
    for (const group of grouped.values()) {
      group.sort((a, b) => new Date(a.createdon).getTime() - new Date(b.createdon).getTime());
    }

    // Sort groups by earliest createdon descending
    const sortedGroups = [...grouped.entries()].sort((a, b) => {
      const aEarliest = new Date(a[1][0].createdon).getTime();
      const bEarliest = new Date(b[1][0].createdon).getTime();
      return bEarliest - aEarliest;
    });

    // Flatten: grouped logs first, then ungrouped
    const result: PluginTraceLog[] = [];
    for (const [, group] of sortedGroups) {
      result.push(...group);
    }
    result.push(...ungrouped);

    return result;
  }, [filteredLogs, groupByCorrelation]);

  const applyServerFilters = useCallback(async () => {
    setAppliedFilters(serverFilters);
    // Force refetch after setting applied filters
    if (!baseUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getPluginTraceLogs(baseUrl, serverFilters, pageSize, apiVersion);
      setServerLogs(response.records);
      setNextLink(response.nextLink);
      setHasMore(response.nextLink !== null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugin trace logs';
      setError(errorMessage);
      setServerLogs([]);
      setNextLink(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, serverFilters, pageSize, apiVersion]);

  const clearServerFilters = useCallback(() => {
    setServerFilters({});
    setAppliedFilters({});
    setPageSizeState(100);
    // Manually trigger refetch with empty filters
    (async () => {
      if (!baseUrl) return;
      
      setLoading(true);
      setError(null);

      try {
        const response = await getPluginTraceLogs(baseUrl, {}, 100, apiVersion);
        setServerLogs(response.records);
        setNextLink(response.nextLink);
        setHasMore(response.nextLink !== null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugin trace logs';
        setError(errorMessage);
        setServerLogs([]);
        setNextLink(null);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [baseUrl, pageSize, apiVersion]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
  }, []);

  return {
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
    groupByCorrelation,
    toggleGroupByCorrelation,
    displayLogs,
    loading,
    error,
    refetch: fetchLogs,
  };
}
