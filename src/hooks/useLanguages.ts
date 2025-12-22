// src/hooks/useLanguage.ts
import { useEffect, useState, useCallback } from 'react';
import {
  getProvisionedLanguages,
  whoAmI,
  getUserSettingsRow,
  setUserUiLanguage,
} from '../services/d365Api';
import { getLanguagesBundle } from '../services/languageService';

export function useLanguages(clientUrl: string, apiVersion: string = 'v9.2') {
  const [langs, setLangs] = useState<number[] | null>(null);
  const [baseLcid, setBaseLcid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const { langs: provisioned, baseLcid: base } = await getLanguagesBundle(clientUrl, apiVersion);
        console.log('Provisioned languages:', provisioned, 'Base LCID:', base);
        setLangs(provisioned);
        setBaseLcid(base);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();
  }, [clientUrl, apiVersion]);

  // Optional utilities if the hook also manages user UI language switching
  const switchUserUiLanguage = useCallback(async (lcid: number) => {
    const userId = await whoAmI(clientUrl, apiVersion);
    await setUserUiLanguage(clientUrl, userId, lcid, apiVersion);
  }, [clientUrl, apiVersion]);

  const readUserUiLanguage = useCallback(async () => {
    const userId = await whoAmI(clientUrl, apiVersion);
    const us = await getUserSettingsRow(clientUrl, userId, apiVersion);
    return us.uilanguageid;
  }, [clientUrl, apiVersion]);

  return { langs, baseLcid, error, switchUserUiLanguage, readUserUiLanguage };
}
