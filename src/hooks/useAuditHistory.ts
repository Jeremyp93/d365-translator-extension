import { useState, useEffect, useCallback } from 'react';
import {
  getAuditHistory,
  parseAuditHistory,
  getAttributeDisplayNames,
  getUserNames,
} from '../services/auditHistoryService';
import type { ParsedAuditRecord, DisplayNamesMap } from '../types/audit';

interface UseAuditHistoryResult {
  records: ParsedAuditRecord[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalCount: number;
  hasMore: boolean;
  showDisplayNames: boolean;
  displayNamesMap: DisplayNamesMap;
  displayNamesLoading: boolean;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
  toggleDisplayNames: () => void;
}

/**
 * Hook to manage audit history fetching, pagination, and display names toggle
 */
export function useAuditHistory(
  clientUrl: string,
  entityLogicalName: string,
  recordId: string,
  apiVersion: string,
  pageSize: number = 50
): UseAuditHistoryResult {
  const [records, setRecords] = useState<ParsedAuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showDisplayNames, setShowDisplayNames] = useState(false);
  const [displayNamesMap, setDisplayNamesMap] = useState<DisplayNamesMap>({});
  const [displayNamesLoading, setDisplayNamesLoading] = useState(false);

  const fetchPage = useCallback(
    async (page: number) => {
      if (!clientUrl || !entityLogicalName || !recordId) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await getAuditHistory(
          clientUrl,
          entityLogicalName,
          recordId,
          page,
          pageSize,
          apiVersion
        );

        const parsedRecords = parseAuditHistory(response);

        // Fetch user names for all unique user IDs
        const uniqueUserIds = [...new Set(parsedRecords.map(r => r.userId))];
        const userNamesMap = await getUserNames(clientUrl, uniqueUserIds, apiVersion);

        // Enrich records with user names
        const enrichedRecords = parsedRecords.map(record => ({
          ...record,
          userName: userNamesMap[record.userId] || record.userId,
        }));

        setRecords(enrichedRecords);
        setTotalCount(response.AuditDetailCollection.TotalRecordCount);
        setHasMore(response.AuditDetailCollection.MoreRecords);
        setCurrentPage(page);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('Failed to fetch audit history:', err);
      } finally {
        setLoading(false);
      }
    },
    [clientUrl, entityLogicalName, recordId, pageSize, apiVersion]
  );

  const fetchDisplayNames = useCallback(async () => {
    if (!clientUrl || !entityLogicalName || records.length === 0) {
      return;
    }

    try {
      setDisplayNamesLoading(true);

      // Extract all unique field names from current page
      const fieldNames = new Set<string>();
      records.forEach((record) => {
        record.changedFields.forEach((field) => {
          fieldNames.add(field.fieldName);
        });
      });

      const names = await getAttributeDisplayNames(
        clientUrl,
        entityLogicalName,
        Array.from(fieldNames),
        apiVersion
      );

      setDisplayNamesMap(names);
    } catch (err) {
      console.error('Failed to fetch display names:', err);
      // Don't set error state, just use schema names
    } finally {
      setDisplayNamesLoading(false);
    }
  }, [clientUrl, entityLogicalName, records]);

  // Initial fetch
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // Fetch display names when toggle is enabled
  useEffect(() => {
    if (showDisplayNames && Object.keys(displayNamesMap).length === 0) {
      fetchDisplayNames();
    }
  }, [showDisplayNames, displayNamesMap, fetchDisplayNames]);

  const nextPage = useCallback(() => {
    if (hasMore) {
      fetchPage(currentPage + 1);
    }
  }, [hasMore, currentPage, fetchPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      fetchPage(currentPage - 1);
    }
  }, [currentPage, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(currentPage);
  }, [currentPage, fetchPage]);

  const toggleDisplayNames = useCallback(() => {
    setShowDisplayNames((prev) => !prev);
  }, []);

  return {
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
  };
}
