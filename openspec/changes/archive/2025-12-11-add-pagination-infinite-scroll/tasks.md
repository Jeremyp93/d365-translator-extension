# Implementation Tasks

## 1. Update Service Layer for Pagination
- [x] Modify `getPluginTraceLogs` to accept `pageSize` parameter
- [x] Add `Prefer: odata.maxpagesize` header to API request
- [x] Return `@odata.nextLink` from response alongside records
- [x] Create new `getNextPageOfLogs` function that accepts `nextLink` URL
- [x] Ensure pagination works with existing filters
- [x] Order by `createdon desc` AND `plugintracelogid desc` for deterministic paging
- [x] **Refinement**: Pass `pageSize` parameter to `getNextPageOfLogs` to preserve page size across requests
- [x] **Refinement**: Fix end date filter to use exclusive upper bound (`createdon lt nextDay`) to include all logs on end date
- [x] **Refinement**: Update hasException filter to check for non-null AND non-empty string

## 2. Update Hook Architecture
- [x] Add `pageSize` state (default: 100)
- [x] Add `nextLink` state to store pagination URL
- [x] Add `hasMore` boolean state (true when `nextLink` exists)
- [x] Add `isLoadingMore` state for infinite scroll loading indicator
- [x] Add `setPageSize` method to update page size
- [x] Add `loadMoreLogs` method to fetch next page
- [x] Append new logs to existing `serverLogs` array
- [x] Reset pagination state when `applyServerFilters` is called
- [x] Ensure `filteredLogs` includes all loaded pages
- [x] **Refinement**: Remove pagination reset from `setPageSize` to prevent table clearing on dropdown change
- [x] **Refinement**: Pass `pageSize` to `getNextPageOfLogs` in `loadMoreLogs` callback

## 3. Add Page Size Control
- [x] Add page size dropdown to Server Filters section
- [x] Options: 50, 100 (default), 200, 500, 1000
- [x] Connect dropdown to `pageSize` state
- [x] Show helper text: "Records per page"
- [x] **Refinement**: Remove automatic `applyServerFilters` call when page size changes; only apply on "Apply Filters" button click

## 4. Implement Infinite Scroll
- [x] Add scroll detection using Intersection Observer API
- [x] Create a sentinel element at bottom of results table
- [x] When sentinel visible and `hasMore` is true, call `loadMoreLogs()`
- [x] Add prevention of duplicate requests using `isLoadingMore` flag
- [x] Show loading spinner at bottom when `isLoadingMore` is true
- [x] Hide sentinel when `hasMore` is false
- [x] Handle errors gracefully (show error, don't block existing data)
- [x] **Refinement**: Adjust rootMargin to 50px and add threshold: 0.1 for proper scroll detection
- [x] **Refinement**: Add `filteredLogs.length` to useEffect dependencies to re-attach observer after data loads
- [x] **Refinement**: Reorder condition checks (hasMore/isLoadingMore before sentinelRef) for proper observer lifecycle
- [x] **Refinement**: Disable infinite scroll when table sort differs from server default (Created On descending)
- [x] **Refinement**: Track current sort state in parent component to determine if infinite scroll should be active

## 5. Remove Custom Scrollbar
- [x] Remove `overflowY: 'auto'` from `content` style in PluginTraceLogPage
- [x] Change `height: '100vh'` to `minHeight: '100vh'` to allow natural scrolling
- [x] Ensure page uses full viewport height naturally
- [x] Keep horizontal scroll on table container for responsiveness
- [x] Test that browser's native scrollbar appears and works

## 6. Update Results Display
- [x] Update results count to show "Loaded X of X+" when `hasMore` is true
- [x] Show "Loaded X (all)" when `hasMore` is false
- [x] Add loading indicator at bottom of table when fetching more
- [x] Ensure new records append smoothly without jarring UI jumps
- [x] Preserve scroll position when new records load
- [x] **Refinement**: Add notice banner when infinite scroll is disabled due to sorting
- [x] **Refinement**: Add "Reset to Default Sort" button in notice banner to reactivate infinite scroll

## 7. Handle Edge Cases
- [x] Test with 0 results (empty state message)
- [x] Test with exactly page size results (no nextLink)
- [x] Test with filters applied (pagination resets correctly)
- [x] Test quick search with multiple pages loaded (client-side filtering works)
- [x] Test clearing filters with multiple pages loaded (state resets)
- [x] Test error during subsequent page fetch (existing data preserved)
- [x] Test rapid scrolling (`isLoadingMore` prevents duplicate requests)
- [x] **Refinement**: Fix sort arrow indicator not resetting when clicking "Reset to Default Sort" using forwardRef
- [x] **Refinement**: Implement proper callback chain between parent and ResultsTable for sort reset

## 8. Testing & Validation
- [x] Test page sizes: 50, 100, 200, 500, 1000
- [x] Test infinite scroll loads pages until none remain
- [x] Verify native scrollbar appears and works
- [x] Test pagination resets when applying new filters
- [x] Test quick search works on all loaded records
- [x] Test responsive table scroll with native page scroll
- [x] Verify no duplicate records appear (deterministic ordering)
- [x] Test with slow network (loading states visible)
- [x] Test sort changes disable infinite scroll appropriately
- [x] Test reset sort button restores infinite scroll and UI state

## 9. Performance Optimization
- [x] Ensure Intersection Observer is properly cleaned up on unmount
- [x] Verify no memory leaks with large datasets (1000+ records)
- [x] Test scroll performance with multiple pages loaded
- [ ] Consider virtualization if performance degrades with 5000+ records (future enhancement)

## 10. Documentation
- [x] Update inline code comments explaining pagination logic
- [x] Document `nextLink` and pagination state management
- [x] Add JSDoc comments to new service methods
- [x] Document sort behavior and infinite scroll interaction
- [x] Document notice banner behavior when sorting disables infinite scroll
