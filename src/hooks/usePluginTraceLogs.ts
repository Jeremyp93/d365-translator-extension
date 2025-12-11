import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getPluginTraceLogs,
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
 */
export function usePluginTraceLogs(baseUrl: string): UsePluginTraceLogsResult {
  const [serverLogs, setServerLogs] = useState<PluginTraceLog[]>([]);
  const [serverFilters, setServerFilters] = useState<PluginTraceLogFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<PluginTraceLogFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch from server (only when called explicitly)
  const fetchLogs = useCallback(async () => {
    if (!baseUrl) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedLogs = await getPluginTraceLogs(baseUrl, appliedFilters);
      setServerLogs(fetchedLogs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugin trace logs';
      setError(errorMessage);
      setServerLogs([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, appliedFilters]);

  // Initial load on mount only
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]); // Only refetch when baseUrl changes

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
      const fetchedLogs = await getPluginTraceLogs(baseUrl, serverFilters);
      setServerLogs(fetchedLogs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugin trace logs';
      setError(errorMessage);
      setServerLogs([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, serverFilters]);

  const clearServerFilters = useCallback(() => {
    setServerFilters({});
    setAppliedFilters({});
    // Manually trigger refetch with empty filters
    (async () => {
      if (!baseUrl) return;
      
      setLoading(true);
      setError(null);

      try {
        const fetchedLogs = await getPluginTraceLogs(baseUrl, {});
        setServerLogs(fetchedLogs);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugin trace logs';
        setError(errorMessage);
        setServerLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [baseUrl]);

  return {
    serverLogs,
    serverFilters,
    setServerFilters,
    applyServerFilters,
    clearServerFilters,
    searchQuery,
    setSearchQuery,
    filteredLogs,
    loading,
    error,
    refetch: fetchLogs,
  };
}
