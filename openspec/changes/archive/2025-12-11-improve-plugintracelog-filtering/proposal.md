# Change: Improve Plugin Trace Log Filtering and Table Responsiveness

## Why
The current plugin trace log viewer has filtering that triggers API calls on every keystroke, causing performance issues and unnecessary server load. The table layout is also not responsive and breaks on smaller screens, making it difficult to use on tablets or when the browser window is resized. Users need a way to quickly search through loaded results without triggering API calls.

## What Changes
- **Dual filtering system**: Separate quick search (client-side) and server filters (API-based)
- **Quick search input**: Single text input that instantly filters loaded results across multiple columns (Type Name, Message, Exception, Trace Log)
- **Server filters with Apply button**: Existing filter inputs (Type Name, Message, Mode, Duration, Dates) only trigger API requests when user clicks "Apply Filters"
- **Client-side search**: Quick search filters results in-memory with no API calls
- **Server-side filtering**: All server filter fields will be sent as OData query parameters to reduce payload size
- **Responsive table design**: Table will adapt to different screen sizes using CSS techniques (horizontal scroll, column priorities)
- **Loading states**: Better visual feedback during server filtering operations
- **Clear visual separation**: Quick search and server filters are visually distinct sections

## Impact
- **Affected specs**: `plugin-trace-log-viewer`
- **Affected code**: 
  - `src/report/pages/PluginTraceLogPage.tsx` - Major refactor to add quick search and apply button pattern
  - `src/hooks/usePluginTraceLogs.ts` - Update to support dual filtering (client + server)
  - `src/services/pluginTraceLogService.ts` - Already supports server-side filtering, minimal changes
  - Responsive styles for table component
- **Performance**: Should significantly improve by:
  - Reducing API calls (only on Apply, not per keystroke)
  - Enabling instant client-side search for quick exploration
  - Only fetching filtered data from server
- **User Experience**: 
  - Fast, instant search for exploring loaded results
  - Explicit control over expensive server operations
  - Better mobile/tablet support
  - Clear separation between quick search and advanced filtering
