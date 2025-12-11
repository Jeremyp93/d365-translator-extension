# Implementation Tasks

## 1. Update Hook Architecture
- [ ] Refactor `usePluginTraceLogs` hook to support dual filtering system
- [ ] Add `searchQuery` state for client-side quick search
- [ ] Add `serverFilters` state for server-side filtering
- [ ] Add `setSearchQuery()` method for quick search updates
- [ ] Add `setServerFilters()` method for server filter updates
- [ ] Add `applyServerFilters()` method that triggers API fetch
- [ ] Add `filteredLogs` computed value that applies client-side search to server results
- [ ] Use useMemo for `filteredLogs` to optimize performance
- [ ] Only fetch when `applyServerFilters()` is called, not on filter input changes
- [ ] Keep manual `refetch()` method for refresh button

## 2. Add Quick Search Component
- [ ] Create new Quick Search section above server filters
- [ ] Add single text input with search icon
- [ ] Connect input to `searchQuery` state via `setSearchQuery()`
- [ ] Add helper text explaining what columns are searched
- [ ] Ensure search updates are instant (no debouncing needed)
- [ ] Add clear button (X) to quick search input
- [ ] Style with lighter background to differentiate from server filters

## 3. Update Server Filter Component
- [ ] Rename section to "Server Filters" or "Advanced Filters"
- [ ] Rename "Refresh" button to "Apply Filters" with appropriate icon
- [ ] Update button click handler to call `applyServerFilters()` method
- [ ] Add loading state to "Apply Filters" button (disable while loading)
- [ ] Keep "Clear Filters" button to reset server filters and refetch
- [ ] Add visual distinction (border, icon, collapsible) to show it's separate from quick search

## 4. Update Results Display
- [ ] Update results count to show "X of Y" when quick search is active
- [ ] Show "X results" when only server filters applied (no quick search)
- [ ] Pass `filteredLogs` to ResultsTable instead of raw `logs`
- [ ] Ensure empty state messages reflect which filtering is active

## 5. Improve Table Responsiveness
- [ ] Add responsive CSS for table container with horizontal scrolling on small screens
- [ ] Set minimum column widths that work well on mobile (review current minWidth values)
- [ ] Test table on various screen sizes (mobile: 375px, tablet: 768px, desktop: 1024px+)
- [ ] Consider making exception column collapsible on mobile or showing truncated version
- [ ] Ensure expand/collapse functionality works on touch devices

## 6. Optimize Table Rendering
- [ ] Review column widths and adjust for better space utilization
- [ ] Ensure text truncation works properly with ellipsis
- [ ] Test expanded row details on mobile devices
- [ ] Add proper accessibility attributes for responsive behavior

## 7. Testing & Validation
- [ ] Test quick search with various search terms
- [ ] Verify quick search filters across all expected columns
- [ ] Verify quick search has no API calls (client-side only)
- [ ] Test server filters with various combinations of inputs
- [ ] Verify only one API call happens per "Apply Filters" click
- [ ] Test combination of quick search + server filters
- [ ] Test responsive behavior at different breakpoints
- [ ] Verify performance with large result sets (100+ logs)
- [ ] Test that client-side duration filtering still works correctly
- [ ] Verify sort functionality still works after refactor
- [ ] Test clearing quick search vs clearing server filters

## 8. Polish
- [ ] Add empty state messaging for quick search ("No results match 'X'")
- [ ] Add empty state messaging for server filters
- [ ] Ensure visual distinction between quick search and server filters is clear
- [ ] Ensure error messages are responsive and readable
- [ ] Verify theme switching works with responsive layout
- [ ] Add tooltips or help text for filter fields if needed
- [ ] Consider making server filters collapsible for power users
