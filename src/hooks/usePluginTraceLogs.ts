import { useState, useCallback, useEffect } from 'react';
import {
  getPluginTraceLogs,
  PluginTraceLog,
  PluginTraceLogFilters,
} from '../services/pluginTraceLogService';

interface UsePluginTraceLogsResult {
  logs: PluginTraceLog[];
  loading: boolean;
  error: string | null;
  filters: PluginTraceLogFilters;
  setFilters: (filters: PluginTraceLogFilters) => void;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing plugin trace logs state
 */
export function usePluginTraceLogs(baseUrl: string): UsePluginTraceLogsResult {
  const [logs, setLogs] = useState<PluginTraceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PluginTraceLogFilters>({});

  const fetchLogs = useCallback(async () => {
    if (!baseUrl) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedLogs = await getPluginTraceLogs(baseUrl, filters);
      setLogs(fetchedLogs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugin trace logs';
      setError(errorMessage);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, filters]);

  // Auto-fetch when baseUrl or filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchLogs,
  };
}
