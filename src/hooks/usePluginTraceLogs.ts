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
export function usePluginTraceLogs(baseUrl: string): UsePluginTraceLogsResult {
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
      const response = await getPluginTraceLogs(baseUrl, appliedFilters, pageSize);
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
  }, [baseUrl, appliedFilters, pageSize]);

  // Initial load on mount only
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]); // Only refetch when baseUrl changes

  // Load more logs (infinite scroll)
  const loadMoreLogs = useCallback(async () => {
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
  }, [nextLink, isLoadingMore, hasMore, pageSize]);

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

  const applyServerFilters = useCallback(async () => {
    setAppliedFilters(serverFilters);
    // Force refetch after setting applied filters
    if (!baseUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getPluginTraceLogs(baseUrl, serverFilters, pageSize);
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
  }, [baseUrl, serverFilters, pageSize]);

  const clearServerFilters = useCallback(() => {
    setServerFilters({});
    setAppliedFilters({});
    // Manually trigger refetch with empty filters
    (async () => {
      if (!baseUrl) return;
      
      setLoading(true);
      setError(null);

      try {
        const response = await getPluginTraceLogs(baseUrl, {}, pageSize);
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
  }, [baseUrl, pageSize]);

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
    loading,
    error,
    refetch: fetchLogs,
  };
}
