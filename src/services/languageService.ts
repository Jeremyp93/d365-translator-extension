// services/languageService.ts
import { 
  getProvisionedLanguages as getProvisionedLanguagesLive, 
  getOrgBaseLanguageCode,
  whoAmI,
  getUserSettingsRow,
} from './d365Api';
import { storageGet, storageRemove, storageSet } from './storageCache';
import { CACHE_TTL } from '../config/constants';

type LangCache = { when: number; langs: number[] };
const TTL_MS_DEFAULT = CACHE_TTL.PROVISIONED_LANGUAGES;
const USER_LANG_CACHE_KEY = 'userLang'

/** Cached provisioned languages. Falls back to live if cache missing/stale. */
export async function getProvisionedLanguagesCached(
  baseUrl: string,
  apiVersion: string = 'v9.2',
  opts: { ttlMs?: number } = {}
): Promise<number[]> {
  const ttlMs = opts.ttlMs ?? TTL_MS_DEFAULT;

  const cached = await storageGet<LangCache>(baseUrl, USER_LANG_CACHE_KEY);
  if (cached && Array.isArray(cached.langs) && Date.now() - cached.when < ttlMs) {
    return cached.langs.slice();
  }

  const live = await getProvisionedLanguagesLive(baseUrl, apiVersion);
  await storageSet<LangCache>(baseUrl, USER_LANG_CACHE_KEY, { when: Date.now(), langs: live });
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

type UserLangCache = { when: number; lcid: number };
const USER_LANG_TTL_MS = CACHE_TTL.USER_LANGUAGE;

/** Cached current user UI language. Falls back to live if cache missing/stale. */
export async function getUserLanguageCached(
  baseUrl: string,
  apiVersion: string = 'v9.2',
  opts: { ttlMs?: number } = {}
): Promise<number> {
  const ttlMs = opts.ttlMs ?? USER_LANG_TTL_MS;

  const cached = await storageGet<UserLangCache>(baseUrl, USER_LANG_CACHE_KEY);
  if (cached && typeof cached.lcid === 'number' && Date.now() - cached.when < ttlMs) {
    return cached.lcid;
  }

  // Cache miss/stale - fetch from API
  const userId = await whoAmI(baseUrl, apiVersion);
  const userSettings = await getUserSettingsRow(baseUrl, userId, apiVersion);
  const lcid = userSettings.uilanguageid;
  
  await storageSet<UserLangCache>(baseUrl, USER_LANG_CACHE_KEY, { when: Date.now(), lcid });
  return lcid;
}

/** Update user language cache after a language switch. */
export async function updateUserLanguageCache(
  baseUrl: string,
  lcid: number
): Promise<void> {
  await storageSet<UserLangCache>(baseUrl, USER_LANG_CACHE_KEY, { when: Date.now(), lcid });
}

/** Clear user language cache. */
export async function clearUserLanguageCache(baseUrl: string): Promise<void> {
  await storageRemove(baseUrl, USER_LANG_CACHE_KEY);
}
