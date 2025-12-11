# Change Proposal: Add Pagination and Infinite Scroll

## Why

Currently, the plugin trace log viewer has significant limitations when dealing with large datasets:

1. **Fixed 100-record limit**: Only retrieves the first 100 records, with no way to access older logs
2. **Poor UX for large datasets**: Users cannot view historical logs beyond the initial batch
3. **Custom vertical scrollbar**: Uses a custom scroll implementation instead of the browser's native scrollbar, which can feel unnatural
4. **No pagination controls**: Users have no visibility into how many total records exist or ability to navigate pages

These limitations make the tool impractical for troubleshooting issues that occurred outside the most recent 100 log entries, which is a common scenario in production environments.

## What Changes

Implement server-side pagination with infinite scroll and configurable page size for the plugin trace log viewer:

### Core Features
1. **Configurable Page Size**
   - Add dropdown/input in server filters to set page size (50, 100, 200, 500 records)
   - Default to 100 (current behavior)
   - Maximum 5000 (Dynamics 365 Web API limit)

2. **Infinite Scroll (Lazy Loading)**
   - Automatically fetch next page when user scrolls near bottom of results
   - Use Dynamics 365 Web API pagination with `@odata.nextLink`
   - Append new records to existing results seamlessly
   - Show loading indicator while fetching next page
   - Stop fetching when no more pages available

3. **Remove Custom Scrollbar**
   - Remove `overflowY: 'auto'` from content area
   - Use browser's native scrollbar for natural feel
   - Maintain horizontal scroll for table responsiveness

4. **Pagination State Management**
   - Track current page, total loaded records, and next link
   - Reset pagination when filters change
   - Preserve loaded data when using quick search (client-side only)

### Technical Approach
- Leverage Dynamics 365 Web API's `Prefer: odata.maxpagesize` header and `@odata.nextLink` response
- Use `$skiptoken` for deterministic paging (already handled by D365 API)
- Implement Intersection Observer API for efficient scroll detection
- Store pagination state in hook (nextLink, hasMore, isLoadingMore)

## Impact

### Benefits
- **Better data access**: Users can view complete log history, not just first 100 records
- **Improved performance**: Initial load remains fast, data loads progressively as needed
- **Better UX**: Native browser scrollbar, smooth infinite scroll, no pagination complexity for users
- **Flexibility**: Users can adjust page size based on their needs and connection speed

### Risks & Mitigation
- **Memory usage**: Loading thousands of records could impact browser performance
  - *Mitigation*: Add optional "load more" button fallback, document recommended limits
- **Scroll position loss**: Applying new filters while scrolled down could be disorienting
  - *Mitigation*: Scroll to top when filters change, show clear loading state
- **API rate limiting**: Rapid scrolling could trigger D365 rate limits
  - *Mitigation*: Debounce scroll events, use reasonable page sizes

### Testing Requirements
- Verify pagination works with various page sizes (50-5000)
- Test infinite scroll with large datasets (1000+ records)
- Ensure native scrollbar works across browsers
- Confirm pagination resets when filters change
- Test combination with quick search (should work client-side on loaded records)

### Documentation Updates
- Update README with pagination feature description
- Add guidance on optimal page sizes for different use cases
