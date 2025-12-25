/**
 * Hook to validate if the current context is a D365 form page
 * Runs validation on mount
 */

import { useState, useEffect } from 'react';
import { getActiveTab } from '../services/chromeTabService';
import { validateD365Context } from '../utils/d365ContextValidation';
import type { D365ContextState } from '../types/popup';

export function useD365Context(): D365ContextState {
  const [state, setState] = useState<D365ContextState>({
    isValidContext: false,
    isDynamicsEnv: false,
    contextChecking: true,
  });

  useEffect(() => {
    const checkContext = async () => {
      try {
        const tab = await getActiveTab();

        if (!tab?.url) {
          setState({
            isValidContext: false,
            isDynamicsEnv: false,
            contextChecking: false,
          });
          return;
        }

        const validation = validateD365Context(tab.url);

        setState({
          isValidContext: validation.isValidContext,
          isDynamicsEnv: validation.isDynamicsEnv,
          contextChecking: false,
        });
      } catch (e) {
        console.error('Failed to check context:', e);
        setState({
          isValidContext: false,
          isDynamicsEnv: false,
          contextChecking: false,
        });
      }
    };

    checkContext();
  }, []);

  return state;
}
