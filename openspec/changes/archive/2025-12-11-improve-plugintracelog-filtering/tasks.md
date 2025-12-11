# Implementation Tasks

## 1. Update Hook Architecture
- [x] Refactor `usePluginTraceLogs` hook to support dual filtering system
- [x] Add `searchQuery` state for client-side quick search
- [x] Add `serverFilters` state for server-side filtering
- [x] Add `appliedFilters` state to separate user input from API state
- [x] Add `setSearchQuery()` method for quick search updates
- [x] Add `setServerFilters()` method for server filter updates
- [x] Add `applyServerFilters()` method that triggers API fetch
- [x] Add `filteredLogs` computed value that applies client-side search to server results
- [x] Use useMemo for `filteredLogs` to optimize performance
- [x] Only fetch when `applyServerFilters()` is called, not on filter input changes
- [x] Keep manual `refetch()` method for refresh button

## 2. Add Quick Search Component
- [x] Create new Quick Search section below server filters
- [x] Add single text input with search icon
- [x] Connect input to `searchQuery` state via `setSearchQuery()`
- [x] Add helper text explaining instant filtering with no server calls
- [x] Ensure search updates are instant (no debouncing needed)
- [x] Add clear button (X) to quick search input when text is present
- [x] Style with lighter background (`colorNeutralBackground2`) to differentiate from server filters

## 3. Update Server Filter Component
- [x] Rename section to "Server Filters" with settings icon
- [x] Rename "Refresh" button to "Apply Filters" with appropriate icon
- [x] Update button click handler to call `applyServerFilters()` method
- [x] Add loading state to "Apply Filters" button (disable while loading, show loading text)
- [x] Keep "Clear Filters" button to reset server filters and refetch
- [x] Add visual distinction (standard background with border) to show it's separate from quick search
- [x] Add helper text: "Fetch filtered data from Dynamics 365 • Click Apply to execute"
- [x] Fix responsive filter grid (3/2/1 columns with 16px gaps)

## 4. Update Results Display
- [x] Update results count to show "X of Y" when quick search is active
- [x] Show "X results" when only server filters applied (no quick search)
- [x] Pass `filteredLogs` to ResultsTable instead of raw `logs`
- [x] Add empty state message for no server results: "No plugin trace logs found matching the current server filters."
- [x] Add empty state message for no quick search matches: "No results match 'X'. Try a different search term or clear the search."

## 5. Improve Table Responsiveness
- [x] Add responsive CSS for table container with horizontal scrolling on small screens
- [x] Set responsive table min-widths (mobile: 800px, tablet: 900px, desktop: 1200px)
- [x] Add proper overflow handling with touch-optimized scrolling
- [x] Add resizable Type Name column with drag handle
- [x] Set column constraints (min: 150px, max: 800px)
- [x] Add visual feedback for resize handle (hover, cursor change)

## 6. Optimize Table Rendering
- [x] Ensure Type Name column uses dynamic width from resize state
- [x] Ensure text truncation works properly with ellipsis
- [x] Add proper resize handle that doesn't interfere with sorting
- [x] Maintain responsive table behavior across breakpoints

## 7. Testing & Validation
- [x] Built successfully with no compilation errors
- [x] Test quick search with various search terms in browser
- [x] Verify quick search filters across typename, messagename, exceptiondetails, messageblock
- [x] Verify quick search has no API calls (check network tab)
- [x] Test server filters with various combinations of inputs
- [x] Verify only one API call happens per "Apply Filters" click
- [x] Test combination of quick search + server filters
- [x] Test responsive behavior at different breakpoints (mobile, tablet, desktop)
- [x] Test resizable column functionality (drag, min/max constraints)
- [x] Verify sort functionality still works after refactor
- [x] Test clearing quick search vs clearing server filters
- [x] Verify filter grid doesn't have overlapping inputs at any viewport size

## 8. Polish
- [x] Add empty state messaging for quick search ("No results match 'X'")
- [x] Add empty state messaging for server filters
- [x] Ensure visual distinction between quick search and server filters is clear
- [x] Section ordering: Server Filters first, Quick Search second
- [x] Proper helper text for both sections
- [x] Responsive filter input grid implemented
