# Technical Design: Pagination and Infinite Scroll

## Architecture Overview

This change introduces server-side pagination with infinite scroll for Plugin Trace Logs. The design follows Dynamics 365 Web API pagination patterns using `Prefer: odata.maxpagesize` header and `@odata.nextLink` for subsequent pages.

## Components Affected

### 1. Service Layer (`pluginTraceLogService.ts`)

**Current State:**
```typescript
export async function getPluginTraceLogs(filters: PluginTraceLogFilter): Promise<PluginTraceLog[]>
```
- Hardcoded `$top=100`
- Returns all records in single response

**New Design:**
```typescript
interface PaginatedResponse<T> {
  records: T[];
  nextLink: string | null;
}

export async function getPluginTraceLogs(
  filters: PluginTraceLogFilter,
  pageSize: number = 100
): Promise<PaginatedResponse<PluginTraceLog>>

export async function getNextPageOfLogs(
  nextLink: string
): Promise<PaginatedResponse<PluginTraceLog>>
```

**Key Changes:**
- Accept `pageSize` parameter (50-5000)
- Include `Prefer: odata.maxpagesize=${pageSize}` header in request
- Parse `@odata.nextLink` from response
- Return both records and nextLink
- New function to fetch next page using provided nextLink URL
- Maintain deterministic ordering: `$orderby=createdon desc,plugintracelogid desc`

**Implementation Details:**
```typescript
const headers = {
  'Prefer': `odata.maxpagesize=${pageSize}`
};

const response = await fetchJson(url, { headers });
return {
  records: response.value,
  nextLink: response['@odata.nextLink'] || null
};
```

### 2. Hook Layer (`usePluginTraceLogs.ts`)

**Current State:**
```typescript
interface PluginTraceLogsState {
  serverLogs: PluginTraceLog[];
  filteredLogs: PluginTraceLog[];
  isLoading: boolean;
  // ...
}
```

**New Design:**
```typescript
interface PluginTraceLogsState {
  serverLogs: PluginTraceLog[];
  filteredLogs: PluginTraceLog[];
  isLoading: boolean;
  isLoadingMore: boolean;     // NEW
  nextLink: string | null;     // NEW
  hasMore: boolean;            // NEW
  pageSize: number;            // NEW
  // ...
}

interface PluginTraceLogsActions {
  applyServerFilters: () => void;
  applyQuickSearch: (query: string) => void;
  setPageSize: (size: number) => void;  // NEW
  loadMoreLogs: () => Promise<void>;     // NEW
  // ...
}
```

**State Management Flow:**

1. **Initial Load:**
   ```
   User applies filters
   → setIsLoading(true)
   → Call getPluginTraceLogs(filters, pageSize)
   → Set serverLogs = response.records
   → Set nextLink = response.nextLink
   → Set hasMore = nextLink !== null
   → setIsLoading(false)
   ```

2. **Load More:**
   ```
   User scrolls to bottom
   → Check hasMore === true
   → setIsLoadingMore(true)
   → Call getNextPageOfLogs(nextLink)
   → Append response.records to serverLogs
   → Update nextLink = response.nextLink
   → Update hasMore = nextLink !== null
   → setIsLoadingMore(false)
   ```

3. **Page Size Change:**
   ```
   User changes page size
   → setPageSize(newSize)
   → Reset serverLogs = []
   → Reset nextLink = null
   → Reset hasMore = false
   → Trigger applyServerFilters() with new pageSize
   ```

4. **Quick Search:**
   ```
   User types in quick search
   → Filter serverLogs client-side
   → Update filteredLogs
   → Do NOT trigger new API call
   → Preserve all loaded pages
   ```

### 3. UI Layer (`PluginTraceLogPage.tsx`)

**Current State:**
```typescript
<Stack styles={{
  root: {
    height: '100vh',
    overflowY: 'auto'  // Custom scrollbar
  }
}}>
```

**New Design:**

#### A. Remove Custom Scrollbar
```typescript
<Stack styles={{
  root: {
    minHeight: '100vh',  // Changed from height
    // overflowY removed - use browser default
  }
}}>
```

#### B. Add Page Size Control
```typescript
<FilterSection>
  {/* Existing filters */}
  <Dropdown
    label="Page Size"
    selectedKey={pageSize}
    options={[
      { key: 50, text: '50' },
      { key: 100, text: '100 (default)' },
      { key: 200, text: '200' },
      { key: 500, text: '500' },
      { key: 1000, text: '1000' }
    ]}
    onChange={(_, option) => setPageSize(option.key as number)}
    styles={{ root: { width: 150 } }}
  />
</FilterSection>
```

#### C. Implement Infinite Scroll
```typescript
// Intersection Observer sentinel
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!sentinelRef.current || !hasMore || isLoadingMore) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMoreLogs();
      }
    },
    { rootMargin: '100px' } // Trigger 100px before sentinel visible
  );

  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [hasMore, isLoadingMore, loadMoreLogs]);

// Render sentinel at bottom
<ResultsTable logs={filteredLogs} />
{hasMore && (
  <Stack>
    <div ref={sentinelRef} style={{ height: 1 }} />
    {isLoadingMore && <Spinner label="Loading more logs..." />}
  </Stack>
)}
```

#### D. Update Results Display
```typescript
<ResultsSummary>
  {isLoading ? (
    <Spinner label="Loading logs..." />
  ) : (
    <Text>
      Loaded {filteredLogs.length} of {hasMore ? `${serverLogs.length}+` : serverLogs.length} results
      {quickSearch && ` (filtered by "${quickSearch}")`}
    </Text>
  )}
</ResultsSummary>
```

## Data Flow Diagrams

### Initial Load Flow
```
[User applies filters] 
  → [applyServerFilters()]
  → [getPluginTraceLogs(filters, pageSize)]
  → [D365 API: Prefer: odata.maxpagesize=100]
  → [Response: { value: [...], @odata.nextLink: "..." }]
  → [State: serverLogs=records, nextLink=url, hasMore=true]
  → [UI renders records + sentinel]
```

### Infinite Scroll Flow
```
[User scrolls down]
  → [Sentinel enters viewport]
  → [IntersectionObserver triggers]
  → [loadMoreLogs()]
  → [getNextPageOfLogs(nextLink)]
  → [D365 API: GET nextLink URL with $skiptoken]
  → [Response: { value: [...], @odata.nextLink: "..." or null }]
  → [State: serverLogs=[...old, ...new], nextLink=newUrl, hasMore=!!newUrl]
  → [UI appends new records]
```

### Page Size Change Flow
```
[User selects new page size]
  → [setPageSize(newSize)]
  → [Reset: serverLogs=[], nextLink=null, hasMore=false]
  → [applyServerFilters() with new pageSize]
  → [Fresh API call with new pageSize]
  → [State updated with new results]
```

## Debouncing Strategy

To prevent rapid duplicate requests during fast scrolling:

```typescript
const loadMoreLogsDebounced = useMemo(
  () => debounce(() => {
    if (!isLoadingMore && hasMore && nextLink) {
      loadMoreLogs();
    }
  }, 300),
  [isLoadingMore, hasMore, nextLink, loadMoreLogs]
);
```

## Error Handling

1. **Initial Load Error:**
   - Show error message
   - Clear logs
   - Allow retry

2. **Load More Error:**
   - Show error toast
   - Preserve existing loaded data
   - Set `hasMore = false` to prevent infinite retry
   - User can refresh page to start over

3. **API Rate Limiting:**
   - D365 typically allows 6000 requests per 5 minutes per user
   - With 100-record pages, user can load 600,000 records before hitting limit
   - In practice, UI will become slow before API limits hit

## Performance Considerations

### Memory Management
- Loading 1000 pages × 100 records = 100,000 records in memory
- Each PluginTraceLog ~1KB → 100MB of data
- Browser can handle this, but consider warning after 10,000 records

### Scroll Performance
- Intersection Observer is efficient (no scroll event listeners)
- 100px root margin provides smooth UX (preloads before bottom visible)
- If >5000 records, consider react-window virtualization (future enhancement)

### Deterministic Ordering
- Must order by unique column to prevent duplicates across pages
- Use: `$orderby=createdon desc,plugintracelogid desc`
- This ensures consistent ordering even if `createdon` has duplicates

## Browser Compatibility

- **Intersection Observer:** Supported in Chrome 51+, Edge 15+, Firefox 55+
- **Native Scrollbar:** All browsers
- **OData Pagination:** Server-side, browser-agnostic

## Migration Path

1. Update service layer (backward compatible - pageSize defaults to 100)
2. Update hook to support pagination (existing callers work unchanged)
3. Update UI to use new pagination features
4. Remove custom scrollbar styles
5. Deploy and monitor performance

## Testing Scenarios

1. **Happy Path:** Apply filters → scroll → load more → repeat until no more results
2. **Page Size:** Change page size → verify new fetch with correct size
3. **Quick Search:** Load multiple pages → apply quick search → verify client-side filtering
4. **Error Recovery:** Simulate API error during load more → verify existing data preserved
5. **Empty Results:** Apply filters with no matches → verify empty state
6. **Exact Page Match:** Query returns exactly pageSize records with no nextLink
7. **Browser Scroll:** Verify native scrollbar works, no layout issues
8. **Performance:** Load 2000+ records → verify smooth scrolling

## Future Enhancements

1. **Virtualization:** If >5000 records, implement react-window for better performance
2. **Scroll Position:** Remember scroll position when navigating away and back
3. **Infinite Scroll Toggle:** Allow users to disable infinite scroll (manual "Load More" button)
4. **Prefetching:** Start fetching next page when user is 80% through current page
5. **Export All:** Add button to export all records (not just loaded pages)
