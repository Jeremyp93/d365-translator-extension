/**
 * Custom hook for Chrome storage operations
 * Provides type-safe get/set operations with automatic persistence
 */

import { useState, useEffect, useCallback } from 'react';

export function useChromeStorage<T>(
  key: string,
  defaultValue: T,
  storageArea: 'local' | 'session' = 'local'
) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storage = storageArea === 'local' ? chrome.storage.local : chrome.storage.session;

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      try {
        setLoading(true);
        const result = await storage.get(key);
        if (result[key] !== undefined) {
          setValue(result[key]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    loadValue();
  }, [key, storageArea]);

  // Persist value when it changes
  const updateValue = useCallback(
    async (newValue: T) => {
      try {
        setValue(newValue);
        await storage.set({ [key]: newValue });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [key, storageArea]
  );

  const removeValue = useCallback(async () => {
    try {
      await storage.remove(key);
      setValue(defaultValue);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [key, defaultValue, storageArea]);

  return {
    value,
    setValue: updateValue,
    removeValue,
    loading,
    error,
  };
}
