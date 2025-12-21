/**
 * Custom hook for fetching D365 attribute dependencies (forms and views)
 */

import { useEffect, useState } from "react";
import {
  getAttributeDependencies,
  type AttributeDependencyRow,
} from "../services/dependencyService";
import { getErrorMessage } from "../utils/errorHandling";

interface UseAttributeDependenciesResult {
  /** List of forms/views that use this attribute */
  dependencies: AttributeDependencyRow[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * Hook to fetch dependencies (forms and views) for a specific attribute
 * Automatically refetches when metadataId changes
 * Clears dependencies when metadataId is null
 *
 * @param clientUrl - D365 organization URL
 * @param metadataId - Attribute metadata ID (GUID)
 * @param apiVersion - Web API version (e.g., "v9.2")
 * @returns Dependency list, loading state, and error
 *
 * @example
 * const { dependencies, loading, error } = useAttributeDependencies(
 *   clientUrl,
 *   "a1b2c3d4-e5f6-...",
 *   "v9.2"
 * );
 */
export function useAttributeDependencies(
  clientUrl: string,
  metadataId: string | null,
  apiVersion?: string
): UseAttributeDependenciesResult {
  const [dependencies, setDependencies] = useState<AttributeDependencyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientUrl || !metadataId) {
      setDependencies([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        const deps = await getAttributeDependencies(
          clientUrl,
          metadataId,
          apiVersion ?? "v9.2"
        );

        if (!cancelled) {
          setDependencies(deps);
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
  }, [clientUrl, metadataId, apiVersion]);

  return { dependencies, loading, error };
}
