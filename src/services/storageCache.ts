const makeKey = (baseUrl: string, key: string) =>
  `d365x:${key}:${(baseUrl || '').replace(/\/+$/, '').toLowerCase()}`;

// ---- tiny storage helpers (works in extension pages; falls back to localStorage) ----
export async function storageGet<T>(baseUrl: string, key: string): Promise<T | null> {
    const finalKey = makeKey(baseUrl, key);
//   const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;
//   if (hasChromeStorage) {
//     const res = await chrome.storage.local.get(finalKey);
//     return (res?.[finalKey] as T) ?? null;
//   }
  try {
    const raw = localStorage.getItem(finalKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export async function storageSet<T>(baseUrl: string, key: string, value: T): Promise<void> {
    const finalKey = makeKey(baseUrl, key);
//   const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;
//   if (hasChromeStorage) {
//     await chrome.storage.local.set({ [finalKey]: value });
//     return;
//   }
  try {
    localStorage.setItem(finalKey, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
export async function storageRemove(baseUrl: string, key: string): Promise<void> {
    const finalKey = makeKey(baseUrl, key);
//   const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;
//   if (hasChromeStorage) {
//     await chrome.storage.local.remove(finalKey);
//     return;
//   }
  try {
    localStorage.removeItem(finalKey);
  } catch {
    /* ignore */
  }
}