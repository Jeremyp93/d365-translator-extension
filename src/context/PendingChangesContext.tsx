import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import type { PendingChange } from '../types';

/**
 * Generates a unique key for a pending change
 * Format: entity|attribute|lcid
 */
function getChangeKey(entity: string, attribute: string, languageCode: number): string {
  return `${entity}|${attribute}|${languageCode}`;
}

/**
 * Generates a unique key from a PendingChange object
 */
function getChangeKeyFromObject(change: PendingChange): string {
  return getChangeKey(change.entity, change.attribute, change.languageCode);
}

interface PendingChangesContextValue {
  /** Map of all pending changes, keyed by entity|attribute|lcid */
  changes: Map<string, PendingChange>;
  /** Total count of pending changes */
  count: number;
  /** Add or update a pending change */
  addChange: (change: PendingChange) => void;
  /** Add multiple pending changes at once */
  addChanges: (changes: PendingChange[]) => void;
  /** Remove a specific pending change */
  removeChange: (entity: string, attribute: string, languageCode: number) => void;
  /** Clear all pending changes */
  clearAll: () => void;
  /** Get all changes as an array */
  getAllChanges: () => PendingChange[];
  /** Get changes grouped by entity */
  getChangesByEntity: () => Map<string, PendingChange[]>;
  /** Get changes grouped by attribute (within an entity) */
  getChangesByAttribute: (entity: string) => Map<string, PendingChange[]>;
}

const PendingChangesContext = createContext<PendingChangesContextValue | undefined>(undefined);

interface PendingChangesProviderProps {
  children: ReactNode;
}

/**
 * Provider for managing pending translation changes across the application.
 *
 * Uses a Map for O(1) lookup and update performance.
 * Duplicate edits to the same entity/attribute/language automatically replace the previous value.
 */
export function PendingChangesProvider({ children }: PendingChangesProviderProps): JSX.Element {
  const [changes, setChanges] = useState<Map<string, PendingChange>>(new Map());

  const addChange = useCallback((change: PendingChange) => {
    setChanges((prev) => {
      const next = new Map(prev);
      const key = getChangeKeyFromObject(change);
      next.set(key, change);
      return next;
    });
  }, []);

  const addChanges = useCallback((newChanges: PendingChange[]) => {
    setChanges((prev) => {
      const next = new Map(prev);
      newChanges.forEach((change) => {
        const key = getChangeKeyFromObject(change);
        next.set(key, change);
      });
      return next;
    });
  }, []);

  const removeChange = useCallback((entity: string, attribute: string, languageCode: number) => {
    setChanges((prev) => {
      const next = new Map(prev);
      const key = getChangeKey(entity, attribute, languageCode);
      next.delete(key);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setChanges(new Map());
  }, []);

  const getAllChanges = useCallback((): PendingChange[] => {
    return Array.from(changes.values());
  }, [changes]);

  const getChangesByEntity = useCallback((): Map<string, PendingChange[]> => {
    const grouped = new Map<string, PendingChange[]>();
    changes.forEach((change) => {
      const existing = grouped.get(change.entity) || [];
      existing.push(change);
      grouped.set(change.entity, existing);
    });
    return grouped;
  }, [changes]);

  const getChangesByAttribute = useCallback((entity: string): Map<string, PendingChange[]> => {
    const grouped = new Map<string, PendingChange[]>();
    changes.forEach((change) => {
      if (change.entity === entity) {
        const existing = grouped.get(change.attribute) || [];
        existing.push(change);
        grouped.set(change.attribute, existing);
      }
    });
    return grouped;
  }, [changes]);

  const count = useMemo(() => changes.size, [changes]);

  const value: PendingChangesContextValue = {
    changes,
    count,
    addChange,
    addChanges,
    removeChange,
    clearAll,
    getAllChanges,
    getChangesByEntity,
    getChangesByAttribute,
  };

  return (
    <PendingChangesContext.Provider value={value}>
      {children}
    </PendingChangesContext.Provider>
  );
}

/**
 * Hook to access pending changes context.
 * Must be used within a PendingChangesProvider.
 */
export function usePendingChanges(): PendingChangesContextValue {
  const context = useContext(PendingChangesContext);
  if (!context) {
    throw new Error('usePendingChanges must be used within a PendingChangesProvider');
  }
  return context;
}
