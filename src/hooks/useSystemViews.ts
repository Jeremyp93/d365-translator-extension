import { useEffect, useState } from 'react';
import { listSystemViews, type SavedQuerySummary } from '../services/savedQueryService';
import { getErrorMessage } from '../utils/errorHandling';

interface UseSystemViewsResult {
  views: SavedQuerySummary[];
  loading: boolean;
  error: string | null;
}

/** Fetch system views for an entity. Refetches when entity/clientUrl change. */
export function useSystemViews(
  clientUrl: string,
  entity: string | null,
  apiVersion?: string
): UseSystemViewsResult {
  const [views, setViews] = useState<SavedQuerySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientUrl || !entity) {
      setViews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const list = await listSystemViews(clientUrl, entity, apiVersion);
        if (!cancelled) setViews(list);
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientUrl, entity, apiVersion]);

  return { views, loading, error };
}
