// src/hooks/useLanguage.ts
import { useEffect, useState, useCallback } from 'react';
import {
  setUserUiLanguage,
} from '../services/d365Api';
import { 
  getLanguagesBundle,
  getUserLanguageCached,
  updateUserLanguageCache,
} from '../services/languageService';

export function useLanguages(clientUrl: string, apiVersion: string = 'v9.2') {
  const [langs, setLangs] = useState<number[] | null>(null);
  const [baseLcid, setBaseLcid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch languages if we don't have a valid client URL
    if (!clientUrl) {
      setLangs(null);
      setBaseLcid(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const { langs: provisioned, baseLcid: base } = await getLanguagesBundle(clientUrl, apiVersion);
        if (!cancelled) {
          setLangs(provisioned);
          setBaseLcid(base);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
        }
      }
    })();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [clientUrl, apiVersion]);

  // Optional utilities if the hook also manages user UI language switching
  const switchUserUiLanguage = useCallback(async (lcid: number) => {
    // Get userId via whoAmI (imported from d365Api for this function)
    const { whoAmI } = await import('../services/d365Api');
    const userId = await whoAmI(clientUrl, apiVersion);
    await setUserUiLanguage(clientUrl, userId, lcid, apiVersion);
    // Update cache immediately after successful switch
    await updateUserLanguageCache(clientUrl, lcid);
  }, [clientUrl, apiVersion]);

  const readUserUiLanguage = useCallback(async () => {
    return getUserLanguageCached(clientUrl, apiVersion);
  }, [clientUrl, apiVersion]);

  return { langs, baseLcid, error, switchUserUiLanguage, readUserUiLanguage };
}
