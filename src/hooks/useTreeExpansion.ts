/**
 * Custom hook for managing tree expand/collapse state
 */

import { useState, useCallback } from 'react';

interface TreeTab {
  id: string;
  columns: Array<{
    sections: Array<{ id: string }>;
  }>;
}

export interface UseTreeExpansionReturn {
  expandedTabs: Set<string>;
  expandedSections: Set<string>;
  setExpandedTabs: React.Dispatch<React.SetStateAction<Set<string>>>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleTab: (tabId: string) => void;
  toggleSection: (tabId: string, sectionId: string) => void;
  expandAll: (tabs: TreeTab[]) => void;
  collapseAll: () => void;
}

/**
 * Hook to manage expand/collapse state for tree navigation
 * Handles both tab and section expansion states
 *
 * @returns Tree expansion state and control functions
 * @example
 * const { expandedTabs, toggleTab, expandAll } = useTreeExpansion();
 */
export function useTreeExpansion(): UseTreeExpansionReturn {
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleTab = useCallback((tabId: string) => {
    setExpandedTabs(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  }, []);

  const toggleSection = useCallback((tabId: string, sectionId: string) => {
    const key = `${tabId}-${sectionId}`;
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback((tabs: TreeTab[]) => {
    setExpandedTabs(new Set(tabs.map(t => t.id)));
    setExpandedSections(
      new Set(tabs.flatMap(t => t.columns.flatMap(c => c.sections.map(s => `${t.id}-${s.id}`))))
    );
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedTabs(new Set());
    setExpandedSections(new Set());
  }, []);

  return {
    expandedTabs,
    expandedSections,
    setExpandedTabs,
    setExpandedSections,
    toggleTab,
    toggleSection,
    expandAll,
    collapseAll,
  };
}
