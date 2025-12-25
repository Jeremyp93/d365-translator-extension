/**
 * Custom hook for filtering form structure based on search query
 */

import { useMemo } from 'react';
import type { FormStructure, FormTab, FormControl } from '../types';
import { getDisplayLabel } from '../services/formStructureService';

/**
 * Checks if a control matches the search query
 */
function controlMatchesQuery(control: FormControl, query: string): boolean {
  const controlLabel = getDisplayLabel(control.labels);
  return (
    controlLabel.toLowerCase().includes(query) ||
    (control.name?.toLowerCase().includes(query) ?? false) ||
    (control.datafieldname?.toLowerCase().includes(query) ?? false)
  );
}

/**
 * Filters tabs based on search query
 * Returns tabs that match the query or contain matching sections/controls
 */
function filterTabs(tabs: FormTab[], query: string): FormTab[] {
  const matchedTabs: FormTab[] = [];

  for (const tab of tabs) {
    const tabLabel = getDisplayLabel(tab.labels);
    const tabMatches = tabLabel.toLowerCase().includes(query) || tab.name?.toLowerCase().includes(query);

    const matchedColumns = tab.columns.map(col => ({
      ...col,
      sections: col.sections.filter(section => {
        const sectionLabel = getDisplayLabel(section.labels);
        const sectionMatches =
          sectionLabel.toLowerCase().includes(query) || section.name?.toLowerCase().includes(query);

        const controlMatches = section.controls.some(control => controlMatchesQuery(control, query));

        return sectionMatches || controlMatches;
      }),
    }));

    if (tabMatches || matchedColumns.some(c => c.sections.length > 0)) {
      matchedTabs.push({ ...tab, columns: matchedColumns });
    }
  }

  return matchedTabs;
}

/**
 * Hook to filter form structure based on search query
 * Searches through tabs, sections, and controls by label, name, and datafieldname
 *
 * @param structure - Original form structure
 * @param editedStructure - Edited form structure (takes priority)
 * @param searchQuery - Search query string
 * @param structureIsForSelectedForm - Whether the structure belongs to selected form
 * @returns Filtered form structure
 *
 * @example
 * const { filteredStructure } = useFormStructureSearch(
 *   structure,
 *   editedStructure,
 *   searchQuery,
 *   true
 * );
 */
export function useFormStructureSearch(
  structure: FormStructure | null,
  editedStructure: FormStructure | null,
  searchQuery: string,
  structureIsForSelectedForm: boolean
) {
  const filteredStructure = useMemo(() => {
    const baseStructure = structureIsForSelectedForm ? (editedStructure || structure) : null;
    if (!baseStructure || !searchQuery.trim()) return baseStructure;

    const query = searchQuery.toLowerCase();

    // Filter header controls
    const matchedHeaderControls = baseStructure.header?.controls.filter(control =>
      controlMatchesQuery(control, query)
    );

    // Filter tabs
    const matchedTabs = filterTabs(baseStructure.tabs, query);

    // Filter footer controls
    const matchedFooterControls = baseStructure.footer?.controls.filter(control =>
      controlMatchesQuery(control, query)
    );

    return {
      ...baseStructure,
      header: matchedHeaderControls?.length ? { controls: matchedHeaderControls } : undefined,
      tabs: matchedTabs,
      footer: matchedFooterControls?.length ? { controls: matchedFooterControls } : undefined,
    };
  }, [structure, editedStructure, searchQuery, structureIsForSelectedForm]);

  return { filteredStructure };
}
