/**
 * Custom hook for fetching and managing D365 entity list
 */

import { useEffect, useState } from "react";
import { listAllEntities } from "../services/entityMetadataService";
import type { EntitySummary } from "../services/entityMetadataService";
import { getErrorMessage } from "../utils/errorHandling";

interface UseEntityBrowserResult {
  /** List of all entities */
  entities: EntitySummary[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * Hook to fetch all entities from D365
 * Automatically refetches when clientUrl or apiVersion changes
 *
 * @param clientUrl - D365 organization URL
 * @param apiVersion - Web API version (e.g., "v9.2")
 * @returns Entity list, loading state, and error
 *
 * @example
 * const { entities, loading, error } = useEntityBrowser(clientUrl, "v9.2");
 */
export function useEntityBrowser(
  clientUrl: string,
  apiVersion?: string
): UseEntityBrowserResult {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientUrl) return;

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        const entityList = await listAllEntities(clientUrl, apiVersion);

        if (!cancelled) {
          setEntities(entityList);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientUrl, apiVersion]);

  return { entities, loading, error };
}
