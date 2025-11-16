// src/hooks/useLanguage.ts
import { useEffect, useState, useCallback } from 'react';
import {
  getProvisionedLanguages,
  getOrgBaseLanguageCode,
  whoAmI,
  getUserSettingsRow,
  setUserUiLanguage,
} from '../services/d365Api';
import { getProvisionedLanguagesCached } from '../services/languageService';

export function useLanguages(clientUrl: string) {
  const [langs, setLangs] = useState<number[] | null>(null);
  const [baseLcid, setBaseLcid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const [provisioned, base] = await Promise.all([
          getProvisionedLanguagesCached(clientUrl),
          getOrgBaseLanguageCode(clientUrl),
        ]);
        console.log('Provisioned languages:', provisioned, 'Base LCID:', base);
        setLangs(provisioned);
        setBaseLcid(base);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();
  }, [clientUrl]);

  // Optional utilities if the hook also manages user UI language switching
  const switchUserUiLanguage = useCallback(async (lcid: number) => {
    const userId = await whoAmI(clientUrl);
    await setUserUiLanguage(clientUrl, userId, lcid);
  }, [clientUrl]);

  const readUserUiLanguage = useCallback(async () => {
    const userId = await whoAmI(clientUrl);
    const us = await getUserSettingsRow(clientUrl, userId);
    return us.uilanguageid;
  }, [clientUrl]);

  return { langs, baseLcid, error, switchUserUiLanguage, readUserUiLanguage };
}
