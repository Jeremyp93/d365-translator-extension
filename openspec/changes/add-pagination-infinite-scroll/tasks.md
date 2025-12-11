# Implementation Tasks

## 1. Update Service Layer for Pagination
- [ ] Modify `getPluginTraceLogs` to accept `pageSize` parameter
- [ ] Add `Prefer: odata.maxpagesize` header to API request
- [ ] Return `@odata.nextLink` from response alongside records
- [ ] Create new `getNextPageOfLogs` function that accepts `nextLink` URL
- [ ] Ensure pagination works with existing filters
- [ ] Order by `createdon desc` AND `plugintracelogid desc` for deterministic paging

## 2. Update Hook Architecture
- [ ] Add `pageSize` state (default: 100)
- [ ] Add `nextLink` state to store pagination URL
- [ ] Add `hasMore` boolean state (true when `nextLink` exists)
- [ ] Add `isLoadingMore` state for infinite scroll loading indicator
- [ ] Add `setPageSize` method to update page size
- [ ] Add `loadMoreLogs` method to fetch next page
- [ ] Append new logs to existing `serverLogs` array
- [ ] Reset pagination state when `applyServerFilters` is called
- [ ] Ensure `filteredLogs` includes all loaded pages

## 3. Add Page Size Control
- [ ] Add page size dropdown to Server Filters section
- [ ] Options: 50, 100 (default), 200, 500, 1000
- [ ] Connect dropdown to `pageSize` state
- [ ] Show helper text: "Records per page"
- [ ] Ensure changing page size triggers new fetch with filters

## 4. Implement Infinite Scroll
- [ ] Add scroll detection using Intersection Observer API
- [ ] Create a sentinel element at bottom of results table
- [ ] When sentinel visible and `hasMore` is true, call `loadMoreLogs()`
- [ ] Add debouncing to prevent rapid duplicate requests (300ms)
- [ ] Show loading spinner at bottom when `isLoadingMore` is true
- [ ] Hide sentinel when `hasMore` is false
- [ ] Handle errors gracefully (show error, don't block existing data)

## 5. Remove Custom Scrollbar
- [ ] Remove `overflowY: 'auto'` from `content` style in PluginTraceLogPage
- [ ] Remove `height: '100vh'` constraint if it prevents natural scrolling
- [ ] Ensure page uses full viewport height naturally
- [ ] Keep horizontal scroll on table container for responsiveness
- [ ] Test that browser's native scrollbar appears and works

## 6. Update Results Display
- [ ] Update results count to show "Loaded X of Y+" when `hasMore` is true
- [ ] Show "Loaded X results (all)" when `hasMore` is false
- [ ] Add loading indicator at bottom of table when fetching more
- [ ] Ensure new records append smoothly without jarring UI jumps
- [ ] Preserve scroll position when new records load

## 7. Handle Edge Cases
- [ ] Test with 0 results (empty state message)
- [ ] Test with exactly page size results (no nextLink)
- [ ] Test with filters applied (pagination resets correctly)
- [ ] Test quick search with multiple pages loaded (client-side filtering works)
- [ ] Test clearing filters with multiple pages loaded (state resets)
- [ ] Test error during subsequent page fetch (existing data preserved)
- [ ] Test rapid scrolling (debouncing prevents duplicate requests)

## 8. Testing & Validation
- [ ] Test page sizes: 50, 100, 200, 500, 1000
- [ ] Test infinite scroll loads all pages until none remain
- [ ] Verify native scrollbar appears and works across browsers
- [ ] Test pagination resets when applying new filters
- [ ] Test quick search works on all loaded records
- [ ] Test responsive table scroll with native page scroll
- [ ] Verify no duplicate records appear
- [ ] Test with slow network (loading states visible)

## 9. Performance Optimization
- [ ] Ensure Intersection Observer is properly cleaned up on unmount
- [ ] Verify no memory leaks with large datasets (1000+ records)
- [ ] Test scroll performance with 2000+ records loaded
- [ ] Consider virtualization if performance degrades (future enhancement)

## 10. Documentation
- [ ] Update inline code comments explaining pagination logic
- [ ] Document `nextLink` and pagination state management
- [ ] Add JSDoc comments to new service methods
