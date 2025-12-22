/**
 * Custom hook for detecting D365 attribute type
 */

import { useEffect, useState } from "react";
import { getAttributeType } from "../services/optionSetService";
import { getErrorMessage } from "../utils/errorHandling";
import { DEFAULT_API_VERSION } from "../config/constants";

interface UseAttributeTypeResult {
  /** Attribute type (e.g., "Picklist", "String", "Lookup") */
  attributeType: string;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed (optional, since this is non-critical) */
  error: string | null;
}

/**
 * Hook to detect the type of a D365 attribute
 * Returns empty string if detection fails (non-critical operation)
 *
 * @param clientUrl - D365 organization URL
 * @param entityName - Entity logical name
 * @param attributeName - Attribute logical name
 * @param apiVersion - Web API version (defaults to v9.2)
 * @returns Attribute type, loading state, and error
 *
 * @example
 * const { attributeType, loading } = useAttributeType(clientUrl, "account", "industrycode", "v9.2");
 * if (attributeType === "Picklist") {
 *   // Show picklist editor
 * }
 */
export function useAttributeType(
  clientUrl: string | undefined,
  entityName: string | undefined,
  attributeName: string | undefined,
  apiVersion?: string
): UseAttributeTypeResult {
  const [attributeType, setAttributeType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientUrl || !entityName || !attributeName) {
      setAttributeType("");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const type = await getAttributeType(
          clientUrl,
          entityName,
          attributeName,
          apiVersion || DEFAULT_API_VERSION
        );

        if (!cancelled) {
          setAttributeType(type);
        }
      } catch (error: unknown) {
        // Non-critical operation - fail silently
        if (!cancelled) {
          setAttributeType("");
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
  }, [clientUrl, entityName, attributeName, apiVersion]);

  return { attributeType, loading, error };
}
