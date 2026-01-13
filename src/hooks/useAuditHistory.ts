import { useState, useEffect, useCallback } from 'react';
import type { SwitchOnChangeData } from '@fluentui/react-components';
import {
  getAuditHistory,
  parseAuditHistory,
  getAttributeDisplayNames,
  getUserNames,
  getPrincipalNames,
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
  toggleDisplayNames: (ev: React.ChangeEvent<HTMLInputElement>, data: SwitchOnChangeData) => void;
}

/**
 * Hook to manage audit history fetching, pagination, and display names toggle
 *
 * Note on Pagination:
 * - D365 RetrieveRecordChangeHistory supports bidirectional paging with cookies
 * - Cookies are stored per page to enable both forward and backward navigation
 * - nextPage() uses the cookie from the current page's response
 * - prevPage() uses the cookie from the page before the previous page
 * - Each page's cookie is the key to fetch the NEXT page
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

  // Store paging cookies and hasMore per page for bidirectional navigation
  const [cookiesByPage, setCookiesByPage] = useState<Record<number, string | undefined>>({});
  const [hasMoreByPage, setHasMoreByPage] = useState<Record<number, boolean>>({});

  const [showDisplayNames, setShowDisplayNames] = useState(false);
  const [displayNamesMap, setDisplayNamesMap] = useState<DisplayNamesMap>({});
  const [displayNamesLoading, setDisplayNamesLoading] = useState(false);

  const fetchPage = useCallback(
    async (page: number, cookie?: string) => {
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
          apiVersion,
          cookie
        );

        const parsedRecords = parseAuditHistory(response);

        // Fetch user names for all unique user IDs
        const uniqueUserIds = [...new Set(parsedRecords.map(r => r.userId))];
        const userNamesMap = await getUserNames(clientUrl, uniqueUserIds, apiVersion);

        // Fetch principal names for all unique principal IDs (from share audit details)
        const uniquePrincipalIds = [...new Set(
          parsedRecords.flatMap(r =>
            r.changedFields
              .filter(f => f.principalId)
              .map(f => f.principalId!)
          )
        )];
        const principalNamesMap = await getPrincipalNames(clientUrl, uniquePrincipalIds, apiVersion);

        // Enrich records with user names and principal names
        const enrichedRecords = parsedRecords.map(record => ({
          ...record,
          userName: userNamesMap[record.userId] || record.userId,
          changedFields: record.changedFields.map(field => ({
            ...field,
            principalName: field.principalId ? principalNamesMap[field.principalId] : undefined,
          })),
        }));

        setRecords(enrichedRecords);
        setTotalCount(response.AuditDetailCollection.TotalRecordCount);

        // Store cookie and hasMore for THIS page (used when navigating to next page)
        setCookiesByPage(prev => ({
          ...prev,
          [page]: response.AuditDetailCollection.PagingCookie
        }));
        setHasMoreByPage(prev => ({
          ...prev,
          [page]: response.AuditDetailCollection.MoreRecords
        }));

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

  const fetchDisplayNames = useCallback(
    async (fieldNamesToFetch: string[]) => {
      if (!clientUrl || !entityLogicalName || fieldNamesToFetch.length === 0) {
        return;
      }

      try {
        setDisplayNamesLoading(true);

        const names = await getAttributeDisplayNames(
          clientUrl,
          entityLogicalName,
          fieldNamesToFetch,
          apiVersion
        );

        // Merge with existing display names map
        setDisplayNamesMap(prev => ({ ...prev, ...names }));
      } catch (err) {
        console.error('Failed to fetch display names:', err);
        // Don't set error state, just use schema names
      } finally {
        setDisplayNamesLoading(false);
      }
    },
    [clientUrl, entityLogicalName, apiVersion]
  );

  // Initial fetch
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // Fetch display names when toggle is enabled or when page changes
  useEffect(() => {
    if (!showDisplayNames) {
      return;
    }

    // Extract current page's field names
    const currentFieldNames = new Set<string>();
    records.forEach((record) => {
      record.changedFields.forEach((field) => {
        currentFieldNames.add(field.fieldName);
      });
    });

    // Find fields that don't have display names yet
    const missingFields = Array.from(currentFieldNames).filter(
      (fieldName) => !(fieldName in displayNamesMap)
    );

    // Fetch display names only for missing fields
    if (missingFields.length > 0) {
      fetchDisplayNames(missingFields);
    }
  }, [showDisplayNames, records, displayNamesMap, fetchDisplayNames]);

  const nextPage = useCallback(() => {
    const hasMore = hasMoreByPage[currentPage];
    const cookie = cookiesByPage[currentPage];

    if (hasMore && cookie) {
      fetchPage(currentPage + 1, cookie);
    }
  }, [currentPage, cookiesByPage, hasMoreByPage, fetchPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      // Use cookie from page N-2 to fetch page N-1
      // (Page 1's cookie fetches Page 2, so to get Page 2 we need Page 1's cookie)
      const prevPageCookie = cookiesByPage[currentPage - 2];
      fetchPage(currentPage - 1, prevPageCookie);
    }
  }, [currentPage, cookiesByPage, fetchPage]);

  const refresh = useCallback(() => {
    if (currentPage === 1) {
      // Page 1: no cookie needed
      fetchPage(1);
    } else {
      // Other pages: use cookie from previous page
      const prevPageCookie = cookiesByPage[currentPage - 1];
      fetchPage(currentPage, prevPageCookie);
    }
  }, [currentPage, cookiesByPage, fetchPage]);

  const toggleDisplayNames = useCallback(
    (_ev: React.ChangeEvent<HTMLInputElement>, data: SwitchOnChangeData) => {
      setShowDisplayNames(data.checked);
    },
    []
  );

  return {
    records,
    loading,
    error,
    currentPage,
    totalCount,
    hasMore: hasMoreByPage[currentPage] || false,
    showDisplayNames,
    displayNamesMap,
    displayNamesLoading,
    nextPage,
    prevPage,
    refresh,
    toggleDisplayNames,
  };
}
