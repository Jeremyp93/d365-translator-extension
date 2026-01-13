import { useEffect, useState } from 'react';
import type { AuditContext } from '../types/audit';

interface UseAuditContextResult {
  context: AuditContext | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to load audit context from chrome.storage.session
 * Context is stored by the background worker when opening the side panel
 */
export function useAuditContext(): UseAuditContextResult {
  const [context, setContext] = useState<AuditContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get tab ID from URL parameter (set by popup when opening side panel)
        const params = new URLSearchParams(window.location.search);
        const tabIdStr = params.get('tabId');
        const tabId = tabIdStr ? parseInt(tabIdStr, 10) : null;

        if (!tabId || isNaN(tabId)) {
          throw new Error('Tab ID not provided in URL. Please reopen the side panel.');
        }

        // Load context from session storage
        const key = `auditContext_${tabId}`;
        const result = await chrome.storage.session.get(key);
        const stored = result[key];

        if (!stored || !stored.entityLogicalName || !stored.recordId || !stored.clientUrl || !stored.apiVersion) {
          throw new Error('Audit context not found. Please reopen the side panel from a D365 form.');
        }

        setContext({
          clientUrl: stored.clientUrl,
          entityLogicalName: stored.entityLogicalName,
          recordId: stored.recordId,
          apiVersion: stored.apiVersion,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('Failed to load audit context:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContext();

    // Cleanup: Remove audit context when side panel unmounts
    return () => {
      const params = new URLSearchParams(window.location.search);
      const tabIdStr = params.get('tabId');
      const tabId = tabIdStr ? parseInt(tabIdStr, 10) : null;

      if (tabId && !isNaN(tabId)) {
        const key = `auditContext_${tabId}`;
        chrome.storage.session.remove(key).catch(err => {
          console.warn('Failed to clean up audit context:', err);
        });
      }
    };
  }, []);

  return { context, loading, error };
}
