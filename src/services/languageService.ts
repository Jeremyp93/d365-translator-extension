// services/languageService.ts
import { getProvisionedLanguages as getProvisionedLanguagesLive, getOrgBaseLanguageCode } from './d365Api';
import { storageGet, storageRemove, storageSet } from './storageCache';
import { CACHE_TTL } from '../config/constants';

type LangCache = { when: number; langs: number[] };
const TTL_MS_DEFAULT = CACHE_TTL.PROVISIONED_LANGUAGES;

/** Cached provisioned languages. Falls back to live if cache missing/stale. */
export async function getProvisionedLanguagesCached(
  baseUrl: string,
  apiVersion: string = 'v9.2',
  opts: { ttlMs?: number } = {}
): Promise<number[]> {
  const ttlMs = opts.ttlMs ?? TTL_MS_DEFAULT;
  const key = 'provLangs';

  const cached = await storageGet<LangCache>(baseUrl, key);
  if (cached && Array.isArray(cached.langs) && Date.now() - cached.when < ttlMs) {
    return cached.langs.slice();
  }

  const live = await getProvisionedLanguagesLive(baseUrl, apiVersion);
  await storageSet<LangCache>(baseUrl, key, { when: Date.now(), langs: live });
  return live;
}

/** Warm the cache proactively (optional). */
export async function warmProvisionedLanguagesCache(baseUrl: string, apiVersion: string = 'v9.2', ttlMs?: number): Promise<number[]> {
  return getProvisionedLanguagesCached(baseUrl, apiVersion, { ttlMs });
}

/** Clear cached provisioned languages (e.g., after enabling a new language). */
export async function clearProvisionedLanguagesCache(baseUrl: string, key: string): Promise<void> {
  await storageRemove(baseUrl, key);
}

/** Convenience: returns { langs, baseLcid } together (langs cached, base live). */
export async function getLanguagesBundle(
  baseUrl: string,
  apiVersion: string = 'v9.2',
  opts?: { ttlMs?: number }
): Promise<{ langs: number[]; baseLcid: number }> {
  const [langs, baseLcid] = await Promise.all([
    getProvisionedLanguagesCached(baseUrl, apiVersion, opts),
    getOrgBaseLanguageCode(baseUrl, apiVersion),
  ]);
  return { langs, baseLcid };
}
