/**
 * Custom hook for fetching D365 entity attributes
 */

import { useEffect, useState } from "react";
import { listEntityAttributes } from "../services/entityMetadataService";
import type { AttributeSummary } from "../services/entityMetadataService";
import { getErrorMessage } from "../utils/errorHandling";

interface UseEntityAttributesResult {
  /** List of attributes for the selected entity */
  attributes: AttributeSummary[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * Hook to fetch attributes for a specific D365 entity
 * Automatically refetches when entityName changes
 * Clears attributes when entityName is null
 *
 * @param clientUrl - D365 organization URL
 * @param entityName - Entity logical name (e.g., "account", "contact")
 * @param apiVersion - Web API version (e.g., "v9.2")
 * @returns Attribute list, loading state, and error
 *
 * @example
 * const { attributes, loading, error } = useEntityAttributes(clientUrl, "account", "v9.2");
 */
export function useEntityAttributes(
  clientUrl: string,
  entityName: string | null,
  apiVersion?: string
): UseEntityAttributesResult {
  const [attributes, setAttributes] = useState<AttributeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientUrl || !entityName) {
      setAttributes([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        const attributeList = await listEntityAttributes(
          clientUrl,
          entityName,
          apiVersion
        );

        if (!cancelled) {
          setAttributes(attributeList);
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
  }, [clientUrl, entityName, apiVersion]);

  return { attributes, loading, error };
}
