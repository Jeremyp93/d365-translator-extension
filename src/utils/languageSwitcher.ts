import { whoAmI, getUserSettingsRow, setUserUiLanguage } from '../services/d365Api';
import { languageNames } from './languageNames';

export interface UserLanguageSettings {
  uilanguageid: number;
  helplanguageid: number;
  localeid: number;
}

/**
 * Validate if an LCID is supported
 */
function isValidLcid(lcid: number): boolean {
  return lcid in languageNames;
}

export interface LanguageSwitchContext {
  baseUrl: string;
  userId: string;
  originalSettings: UserLanguageSettings;
}

/**
 * Execute a callback for each language code, switching user UI language before each call
 * Automatically restores original language settings when done
 */
export async function forEachLanguage<T>(
  baseUrl: string,
  lcids: number[],
  callback: (lcid: number, context: LanguageSwitchContext) => Promise<T>
): Promise<T[]> {
  if (!lcids?.length) return [];

  // Validate all LCIDs before starting
  const invalidLcids = lcids.filter(lcid => !isValidLcid(lcid));
  if (invalidLcids.length > 0) {
    console.warn(`Warning: Invalid LCIDs will be skipped: ${invalidLcids.join(', ')}`);
  }

  const validLcids = lcids.filter(isValidLcid);
  if (validLcids.length === 0) {
    throw new Error('No valid language codes provided');
  }

  // Get user and save original settings
  const userId = await whoAmI(baseUrl);
  const userSettings = await getUserSettingsRow(baseUrl, userId);
  const originalSettings: UserLanguageSettings = {
    uilanguageid: userSettings.uilanguageid,
    helplanguageid: userSettings.helplanguageid,
    localeid: userSettings.localeid,
  };

  const context: LanguageSwitchContext = { baseUrl, userId, originalSettings };
  const results: T[] = [];

  try {
    for (const lcid of validLcids) {
      // Switch to target language
      await setUserUiLanguage(baseUrl, userId, lcid);

      // Execute callback for this language
      const result = await callback(lcid, context);
      results.push(result);
    }
  } finally {
    // Always restore original language
    try {
      await setUserUiLanguage(baseUrl, userId, originalSettings.uilanguageid);
    } catch (error) {
      console.error('Failed to restore original language:', error);
    }
  }

  return results;
}

/**
 * Execute a callback once per language with automatic language switching
 * Returns a single result (use when you need to aggregate data across languages)
 */
export async function withAllLanguages<T>(
  baseUrl: string,
  lcids: number[],
  callback: (lcids: number[], context: LanguageSwitchContext) => Promise<T>
): Promise<T> {
  if (!lcids?.length) {
    throw new Error('No language codes provided');
  }

  // Validate LCIDs
  const invalidLcids = lcids.filter(lcid => !isValidLcid(lcid));
  if (invalidLcids.length > 0) {
    console.warn(`Warning: Invalid LCIDs found: ${invalidLcids.join(', ')}`);
  }

  const validLcids = lcids.filter(isValidLcid);
  if (validLcids.length === 0) {
    throw new Error('No valid language codes provided');
  }

  const userId = await whoAmI(baseUrl);
  const userSettings = await getUserSettingsRow(baseUrl, userId);
  const originalSettings: UserLanguageSettings = {
    uilanguageid: userSettings.uilanguageid,
    helplanguageid: userSettings.helplanguageid,
    localeid: userSettings.localeid,
  };

  const context: LanguageSwitchContext = { baseUrl, userId, originalSettings };

  try {
    return await callback(validLcids, context);
  } finally {
    try {
      await setUserUiLanguage(baseUrl, userId, originalSettings.uilanguageid);
    } catch (error) {
      console.error('Failed to restore original language:', error);
    }
  }
}
