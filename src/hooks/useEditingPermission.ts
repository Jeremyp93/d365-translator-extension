import { useEffect, useState } from 'react';
import { checkEditingPermission } from '../services/editingPermissionService';

interface UseEditingPermissionResult {
  isEditingBlocked: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to check if editing is allowed in the current D365 environment
 * based on the environment variable setting.
 *
 * @param clientUrl - The D365 organization base URL
 * @returns Object with isEditingBlocked flag, loading state, and error
 */
export function useEditingPermission(clientUrl: string, apiVersion: string = 'v9.2'): UseEditingPermissionResult {
  const [isEditingBlocked, setIsEditingBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientUrl) {
      setIsEditingBlocked(false);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    async function checkPermission() {
      setLoading(true);
      setError(null);

      try {
        const isAllowed = await checkEditingPermission(clientUrl, apiVersion);

        if (isMounted) {
          setIsEditingBlocked(!isAllowed);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          setIsEditingBlocked(false); // Fail-open: allow editing on error
          setLoading(false);
        }
      }
    }

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [clientUrl, apiVersion]);

  return { isEditingBlocked, loading, error };
}
