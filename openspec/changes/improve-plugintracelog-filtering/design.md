# Design: Plugin Trace Log Filtering and Responsiveness

## Architecture Decisions

### Dual Filtering System

**Problem**: Current implementation triggers API calls on every keystroke, causing performance issues. Users also need quick ways to explore already-loaded results.

**Solution**: Implement a two-tier filtering system:
1. **Quick Search (Client-side)**: Single text input that instantly filters loaded results across multiple columns
2. **Server Filters (API-based)**: Multiple specific filter inputs that only trigger API calls when "Apply" is clicked

```typescript
// Hook interface
interface UsePluginTraceLogsApi {
  // Server state
  serverLogs: PluginTraceLog[];        // Raw data from API
  serverFilters: PluginTraceLogFilters;
  setServerFilters: (filters: PluginTraceLogFilters) => void;
  applyServerFilters: () => Promise<void>;
  clearServerFilters: () => void;
  
  // Client state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Combined result
  filteredLogs: PluginTraceLog[];      // Server logs filtered by search query
  
  // Status
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Benefits**:
- Instant search for quick exploration (no API calls)
- Reduced API calls (only when Apply is clicked)
- Clear separation between fast local search and powerful server filtering
- Best of both worlds: speed + precision
- Users maintain control over expensive operations

### Responsive Table Strategy

**Problem**: Fixed-width table breaks on small screens.

**Solution**: Progressive enhancement approach with multiple techniques:

1. **Horizontal Scroll** (Primary, 0-768px)
   - Table container with `overflow-x: auto`
   - Maintain minimum column widths for readability
   - Add scroll shadows/indicators for UX

2. **Flexible Columns** (Tablet, 768px-1024px)
   - Use flexible widths instead of fixed minWidth
   - Priority-based column sizing (most important columns get more space)

3. **Full Width** (Desktop, 1024px+)
   - Current behavior maintained

**Column Priorities** (for responsive sizing):
- **Critical**: Type Name, Message, Duration, Exception
- **Important**: Mode, Created On
- **Optional**: Operation Type, Depth

### State Management Flow

```
User types in Quick Search → searchQuery updates (local only)
                           ↓
                     filteredLogs = serverLogs.filter(searchQuery)
                           ↓
                     Table updates instantly (no API call)

User modifies Server Filters → serverFilters updates (local only)
                             ↓
User clicks "Apply Filters" → applyServerFilters()
                             ↓
                     API call with serverFilters (OData $filter)
                             ↓
                     serverLogs updates
                             ↓
                     filteredLogs = serverLogs.filter(searchQuery)
                             ↓
                     Table updates with new data
```

### Client-Side Search Implementation

```typescript
// In usePluginTraceLogs hook
const filteredLogs = useMemo(() => {
  if (!searchQuery.trim()) return serverLogs;
  
  const query = searchQuery.toLowerCase();
  return serverLogs.filter(log => 
    log.typename?.toLowerCase().includes(query) ||
    log.messagename?.toLowerCase().includes(query) ||
    log.exceptiondetails?.toLowerCase().includes(query) ||
    log.messageblock?.toLowerCase().includes(query)
  );
}, [serverLogs, searchQuery]);
```

**Searched Columns**:
- Type Name (typename)
- Message Name (messagename)
- Exception Details (exceptiondetails)
- Trace Log / Message Block (messageblock)

### Performance Optimizations

1. **No debouncing needed**: Quick search is instant (client-side), no API calls
2. **Memoization**: Use useMemo for filteredLogs to avoid unnecessary re-filtering
3. **Explicit apply**: Server filters only call API when Apply is clicked
4. **Virtual Scrolling**: Consider for future if result sets exceed 500+ rows
5. **Pagination**: Consider for future enhancement (not in this change)

## Implementation Notes

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Quick Search                                             │
│ [Search in results........................] 🔍              │
│ Searches: Type Name, Message, Exception, Trace Log          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Server Filters                                            │
│                                                             │
│ Type Name    [........................]                     │
│ Message Name [........................]                     │
│ Mode         [All            ▼]                             │
│ Min Duration [....] Max Duration [....]                     │
│ Start Date   [........] End Date [.......]                  │
│ ☐ Show only exceptions                                      │
│                                                             │
│ [Clear Filters] [Apply Filters]                             │
└─────────────────────────────────────────────────────────────┘

Results (5 of 23)  ← "5 matching search, 23 from server"
```

### Visual Distinction

- **Quick Search**: Light background, single input, prominent placement, always visible
- **Server Filters**: Slightly darker background, multiple inputs, collapsible (optional), labeled "Advanced"

### Hook Refactoring

```typescript
export function usePluginTraceLogs(baseUrl: string): UsePluginTraceLogsApi {
  const [serverLogs, setServerLogs] = useState<PluginTraceLog[]>([]);
  const [serverFilters, setServerFilters] = useState<PluginTraceLogFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch from server (only when called explicitly)
  const fetchLogs = useCallback(async () => {
    if (!baseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const logs = await getPluginTraceLogs(baseUrl, serverFilters);
      setServerLogs(logs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, serverFilters]);

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side filtering (memoized for performance)
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return serverLogs;
    
    const query = searchQuery.toLowerCase();
    return serverLogs.filter(log => 
      log.typename?.toLowerCase().includes(query) ||
      log.messagename?.toLowerCase().includes(query) ||
      log.exceptiondetails?.toLowerCase().includes(query) ||
      log.messageblock?.toLowerCase().includes(query)
    );
  }, [serverLogs, searchQuery]);

  const clearServerFilters = useCallback(() => {
    setServerFilters({});
    // fetchLogs will be called automatically via useEffect
  }, []);

  return {
    serverLogs,
    serverFilters,
    setServerFilters,
    applyServerFilters: fetchLogs,
    clearServerFilters,
    searchQuery,
    setSearchQuery,
    filteredLogs,
    loading,
    error,
    refetch: fetchLogs,
  };
}
```

### Component Changes

```typescript
export default function PluginTraceLogPage() {
  const { clientUrl } = useOrgContext();
  const {
    serverLogs,
    serverFilters,
    setServerFilters,
    applyServerFilters,
    searchQuery,
    setSearchQuery,
    filteredLogs,
    loading,
    error,
  } = usePluginTraceLogs(clientUrl);

  return (
    <div className={styles.page}>
      {/* Quick Search Section */}
      <div className={styles.quickSearchSection}>
        <Text className={styles.sectionTitle}>
          <Search20Regular /> Quick Search
        </Text>
        <Input
          placeholder="Search in results (Type Name, Message, Exception, Trace Log...)"
          value={searchQuery}
          onChange={(_, data) => setSearchQuery(data.value)}
          contentAfter={<Search20Regular />}
        />
        <Text size={200} style={{color: tokens.colorNeutralForeground3}}>
          Instantly filters loaded results • No server calls
        </Text>
      </div>

      {/* Server Filters Section */}
      <ServerFilterSection
        filters={serverFilters}
        onFiltersChange={setServerFilters}
        onApply={applyServerFilters}
        onClear={clearServerFilters}
        loading={loading}
      />

      {/* Results */}
      <div className={styles.resultsHeader}>
        <Text weight="semibold">
          Results ({filteredLogs.length}
          {searchQuery && ` of ${serverLogs.length}`})
        </Text>
      </div>

      <ResultsTable logs={filteredLogs} />
    </div>
  );
}

// ServerFilterSection component
function ServerFilterSection({ filters, onFiltersChange, onApply, onClear, loading }) {
  const styles = useStyles();
  
  const handleFilterChange = (field: keyof PluginTraceLogFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className={styles.serverFilterSection}>
      <Text className={styles.sectionTitle}>
        <Settings20Regular /> Server Filters
      </Text>
      <Text size={200} style={{color: tokens.colorNeutralForeground3}}>
        Fetch filtered data from Dynamics 365 • Click Apply to execute
      </Text>

      <div className={styles.filterGrid}>
        <Input
          placeholder="Type Name (e.g., MyPlugin)"
          value={filters.typename || ''}
          onChange={(_, data) => handleFilterChange('typename', data.value)}
        />
        {/* ... other filter inputs ... */}
      </div>

      <div className={styles.filterActions}>
        <Button appearance="secondary" onClick={onClear}>
          Clear Filters
        </Button>
        <Button 
          appearance="primary" 
          icon={<ArrowClockwiseRegular />} 
          onClick={onApply}
          disabled={loading}
        >
          {loading ? 'Applying...' : 'Apply Filters'}
        </Button>
      </div>
    </div>
  );
}
```

### CSS Responsive Breakpoints
```scss
// Mobile first approach
.quickSearchSection {
  padding: 16px;
  background-color: tokens.colorNeutralBackground2;
  border-radius: tokens.borderRadiusMedium;
  margin-bottom: 16px;
}

.serverFilterSection {
  padding: 16px;
  background-color: tokens.colorNeutralBackground1;
  border: 1px solid tokens.colorNeutralStroke1;
  border-radius: tokens.borderRadiusMedium;
  margin-bottom: 24px;
}

.tableContainer {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; // Smooth scroll on iOS
}

@media (max-width: 768px) {
  // Hide less critical columns on mobile
  .depth-column { display: none; }
  .operationType-column { display: none; }
  
  // Stack filter inputs vertically
  .filterGrid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  // Flexible widths for tablet
  table { min-width: 100%; }
  
  .filterGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1025px) {
  // Full table with all columns
  table { width: 100%; }
  
  .filterGrid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}
```

## Testing Strategy

### Dual Filtering Testing
1. **Quick Search Only**
   - Type in quick search → Verify instant filtering
   - Verify no API calls (check network tab)
   - Test search across all columns (typename, message, exception, trace)
   - Test with empty search → Shows all server results

2. **Server Filters Only**
   - Type in server filters → Verify no API call
   - Click Apply → Verify single API call
   - Verify correct OData $filter parameters
   - Test various filter combinations

3. **Combined Filtering**
   - Apply server filters → Get 50 logs
   - Use quick search → Filter those 50 logs client-side
   - Verify results count shows "X of 50"
   - Clear quick search → Shows all 50 again
   - Clear server filters → Refetch all logs

### Responsive Testing
- Chrome DevTools device emulation
- Test breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop)
- Test touch interactions on expandable rows
- Verify horizontal scroll indicators
- Test filter grid layout at different widths

### Performance Testing
- Network tab: Confirm reduced API calls
- Check payload sizes before/after server filtering
- Test quick search performance with 100+ logs
- Verify useMemo prevents unnecessary re-filtering

## Constraints

### Technical
- Must maintain existing D365 Web API OData filter format
- Duration filtering stays client-side (OData limitation on calculated fields)
- Quick search must be case-insensitive for better UX
- Must work with existing theme system
- Must maintain sort functionality

### UX
- Quick search should feel instant (no artificial delays)
- Server filter inputs should not feel sluggish (immediate local updates)
- Users should understand the difference between quick search and server filters
- Mobile users should be able to access all functionality
- Results count should clearly indicate which filters are active

## Future Enhancements (Out of Scope)
- Pagination for very large result sets
- Filter presets/saved searches
- Export filtered results
- Real-time log streaming
- Advanced query builder UI
- Highlight search terms in results
- Search history/recent searches
