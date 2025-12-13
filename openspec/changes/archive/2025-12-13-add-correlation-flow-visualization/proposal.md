# Change: Add Correlation Flow Visualization

## Why

When troubleshooting complex plugin execution chains in Dynamics 365, developers need to understand the execution order and parent-child relationships between plugin trace logs. Currently, users can view individual trace logs in a table with expandable details, but there's no visual representation of:

1. **Execution flow**: How plugins execute in sequence and at different depth levels
2. **Parent-child relationships**: Which plugins triggered other plugins (indicated by depth changes)
3. **Correlation context**: Which logs belong to the same logical operation (correlation ID)

This makes it difficult to diagnose issues in complex scenarios involving multiple plugins, workflows, and async operations spanning different depth levels. A visual flow diagram would dramatically improve troubleshooting efficiency by showing the complete execution timeline at a glance.

## What Changes

Add an interactive correlation flow visualization to the Plugin Trace Log Viewer:

### Core Features
1. **Fluent UI Panel with Timeline Diagram**
   - Right-side panel opened from "View flow" action on any table row
   - Swimlane layout with depth (0, 1, 2, ...) as horizontal lanes
   - Vertical axis represents execution order (by createdOn or table index)
   - Each node shows: typeName, stage, mode, duration, exception indicator

2. **On-Demand Data Fetching**
   - Fetch all trace logs for a correlation ID only when panel is opened
   - Cache fetched flows in-memory by correlationId for session
   - Show Fluent UI Spinner during fetch; MessageBar on error

3. **Bidirectional Sync with Table**
   - **Node click** → selects, scrolls to, and expands corresponding table row
   - **Row expansion** → highlights corresponding node in diagram (when correlationIds match)
   - **Panel switching** → fetch different correlation when "View flow" clicked for different correlationId

4. **Visual Elements**
   - **Nodes**: Display typeName, stage, mode, duration
   - **Arrows**: Connect nodes in execution sequence
   - **Parent-child arrows**: Draw from depth N-1 to depth N when depth increases
   - **Exception indicators**: Visual badge/icon when exception exists
   - **Mode distinction**: Visual differentiation for Async vs Sync (e.g., dashed border)

### Technical Approach
- Use **React Flow v11.11.4** library for interactive node/edge rendering with pan/zoom
- Advanced positioning algorithm to prevent node overlaps:
  - Track nextYByDepth Map and maxYGlobal for vertical positioning
  - Apply rules for same/different timestamps and depths
  - ROW_SPACING = 200px, LANE_WIDTH = 350px
- Intelligent parent-child edge detection:
  - Score-based heuristic (typename, message, depth, time proximity)
  - MAX_PARENT_TIME_DIFF_MS threshold (120 seconds)
  - Namespace prefix matching requirement
- Compact depth lanes (skip gaps in depth values)
- Custom node component with Handle components for edge attachment
- LRU cache (max 20) for correlation flows
- Single source of truth for `selectedRowId` and `expandedRowIds` to prevent render loops

## Impact

### Benefits
- **Faster troubleshooting**: Visual understanding of plugin execution chains
- **Better context**: See parent-child relationships and execution order at a glance
- **Improved UX**: Interactive diagram synced with table for seamless navigation

### Affected Specs
- `plugin-trace-log-viewer`: Add correlation flow visualization capability

### Affected Code
- `/report/pages/PluginTraceLogPage.tsx`: Add "View flow" action, handle panel state
- New `/report/components/CorrelationFlowPanel.tsx`: Panel component with diagram
- New `/report/utils/flowGraphBuilder.ts`: Pure function to build graph from rows
- `/services/pluginTraceLogService.ts`: Potentially add correlation-specific fetch (or reuse existing)

### Risks & Mitigation
- **Performance with large correlation sets**: If 500+ logs in one correlation
  - *Mitigation*: React Flow handles virtualization; limit initial render to 200 nodes with load more
- **Memory usage**: Caching all flows in session
  - *Mitigation*: LRU cache with max 20 correlations; clear on filter changes
- **Complex edge routing**: Many depth transitions could create visual clutter
  - *Mitigation*: Use simple direct arrows; React Flow handles basic routing

### Security
- No new permissions required
- Uses existing Dataverse access patterns from table
- Fetch only trace rows within same correlation scope

### Testing Requirements
- `buildFlowGraph` unit tests for positioning, edge creation, status mapping
- React Testing Library tests for panel opening, node clicks, row expansion sync
- Manual testing with real D365 correlation IDs (multi-depth scenarios)
