const makeKey = (baseUrl: string, key: string): string =>
  `d365x:${key}:${(baseUrl || '').replace(/\/+$/, '').toLowerCase()}`;

/**
 * Get item from localStorage with JSON parsing
 * @param baseUrl - Organization base URL
 * @param key - Storage key
 * @returns Parsed value or null if not found
 */
export async function storageGet<T>(baseUrl: string, key: string): Promise<T | null> {
  const finalKey = makeKey(baseUrl, key);

  try {
    const raw = localStorage.getItem(finalKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Set item in localStorage with JSON stringification
 * @param baseUrl - Organization base URL
 * @param key - Storage key
 * @param value - Value to store
 */
export async function storageSet<T>(baseUrl: string, key: string, value: T): Promise<void> {
  const finalKey = makeKey(baseUrl, key);

  try {
    localStorage.setItem(finalKey, JSON.stringify(value));
  } catch {
    // Ignore quota exceeded errors
  }
}

/**
 * Remove item from localStorage
 * @param baseUrl - Organization base URL
 * @param key - Storage key
 */
export async function storageRemove(baseUrl: string, key: string): Promise<void> {
  const finalKey = makeKey(baseUrl, key);

  try {
    localStorage.removeItem(finalKey);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all storage for a specific base URL
 * @param baseUrl - Organization base URL
 */
export async function storageClearAll(baseUrl: string): Promise<void> {
  const prefix = 'd365x:';
  const urlKey = (baseUrl || '').replace(/\/+$/, '').toLowerCase();

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && key.includes(urlKey)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}