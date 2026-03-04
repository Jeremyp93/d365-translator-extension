import { useEffect, useState, useCallback } from 'react';
import {
  getEntityLabelTranslations,
  type EntityLabelsResult,
} from '../services/entityLabelService';
import { getErrorMessage } from '../utils/errorHandling';

interface UseEntityLabelsResult {
  labels: EntityLabelsResult | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch all 3 translatable label sets (DisplayName, Description, DisplayCollectionName)
 * for the selected entity.
 */
export function useEntityLabels(
  clientUrl: string,
  entityLogicalName: string | null
): UseEntityLabelsResult {
  const [labels, setLabels] = useState<EntityLabelsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reload = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!clientUrl || !entityLogicalName) {
      setLabels(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);
        const result = await getEntityLabelTranslations(clientUrl, entityLogicalName);
        if (!cancelled) setLabels(result);
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [clientUrl, entityLogicalName, reloadTrigger]);

  return { labels, loading, error, reload };
}
