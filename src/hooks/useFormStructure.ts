import { useState, useCallback } from 'react';
import { getFormXmlAllLanguages } from '../services/formStructureService';
import type { FormStructure } from '../types';

export interface UseFormStructureState {
  structure: FormStructure | null;
  loading: boolean;
  error: string | null;
}

export interface UseFormStructureApi {
  state: UseFormStructureState;
  load: (clientUrl: string, formId: string) => Promise<void>;
  resetError: () => void;
}

/**
 * Hook to load and parse form structure from Dataverse
 * Retrieves formXml in all provisioned languages to get complete label sets
 */
export function useFormStructure(): UseFormStructureApi {
  const [structure, setStructure] = useState<FormStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (clientUrl: string, formId: string) => {
    if (!clientUrl || !formId) {
      setError('Missing clientUrl or formId');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const structure = await getFormXmlAllLanguages(clientUrl, formId);
      setStructure(structure);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStructure(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    state: { structure, loading, error },
    load,
    resetError,
  };
}
