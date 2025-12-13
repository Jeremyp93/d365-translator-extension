# Implementation Tasks

## 1. Install React Flow Dependency
- [x] Add `reactflow` package to package.json
- [x] Add `@types/reactflow` if needed for TypeScript support
- [x] Verify build works with new dependency

## 2. Create Flow Graph Builder Utility
- [x] Create `/report/utils/flowGraphBuilder.ts`
- [x] Implement `buildFlowGraph(rows: PluginTraceLog[]): FlowGraph` function
- [x] Define FlowGraph interface: `{ nodes: FlowNode[], edges: FlowEdge[] }`
- [x] Define FlowNode interface: id, position {x, y}, data {typeName, message, stage, mode, duration, hasException, depth}
- [x] Position nodes: `x = depth * LANE_WIDTH (350px)`, `y` calculated with advanced positioning algorithm
- [x] Advanced positioning algorithm to prevent overlapping nodes:
  - Sort logs by timestamp, then depth, then message name for stability
  - Track next available Y position per depth level (nextYByDepth Map)
  - Track global maximum Y position (maxYGlobal)
  - Apply positioning rules:
    - Same timestamp + same depth → stack vertically at nextYByDepth[depth]
    - Same timestamp + different depth → align horizontally at maxYGlobal
    - Different timestamp → start new row at maxYGlobal + ROW_SPACING (200px)
- [x] Create sequence edges between consecutive operations at same depth
- [x] Create parent-child edges using intelligent heuristic scoring:
  - Score candidates based on typename match, message match, depth difference, time proximity
  - Require parent to be shallower depth, earlier/same timestamp, and same namespace prefix
  - Apply MAX_PARENT_TIME_DIFF_MS threshold (120 seconds) for relevance
  - Select highest-scoring candidate with minimum threshold
- [x] Map compact depth lanes (skip gaps: depths {1,3} → lanes {0,1})
- [x] Map exception presence to node status
- [x] Map mode to visual variant (async vs sync)

## 3. Create Correlation Flow Panel Component
- [x] Create `/report/components/CorrelationFlowPanel.tsx`
- [x] Accept props: `isOpen`, `correlationId`, `selectedRowId`, `expandedRowIds`, `onClose`, `onNodeClick`
- [x] Integrate custom overlay + panel (fixed position, 60vw width, 100vh height)
- [x] Add Panel header with correlation ID display and close button
- [x] Implement on-demand data fetching when panel opens or correlationId changes
- [x] Add in-memory LRU cache (max 20 entries) keyed by correlationId for session
- [x] Show Fluent UI Spinner while fetching
- [x] Show Fluent UI MessageBar on fetch error
- [x] Integrate React Flow component for node/edge rendering
- [x] Configure React Flow with pan/zoom controls, Background, Controls, MiniMap
- [x] Create CustomNode component with Handle components (source right, target left)
- [x] Style nodes based on data:
  - Exception indicator (red badge with "!" icon)
  - Mode distinction (dashed border for Asynchronous)
  - Stage/message display (truncated to 15 chars with tooltip)
  - Duration badge with color coding (green <1s, orange <5s, red ≥5s)
  - Selected/expanded state styling
- [x] Highlight node when selectedRowId matches (border, background color)
- [x] Handle node click event → call onNodeClick(rowId) callback
- [x] Style edges with colors, labels ("calls" for parent-child, "then" for sequence), arrow markers

## 4. Update Plugin Trace Log Page
- [x] Add "View flow" action to each table row (Button with FlowRegular icon)
- [x] Add panel state: `isPanelOpen`, `panelCorrelationId`, `selectedRowId`, `expandedRows`
- [x] Add handler for "View flow" click: open panel with row's correlationId and rowId
- [x] Pass selectedRowId and expandedRowIds to panel
- [x] Implement onNodeClick callback: setSelectedRowId, expand row, scroll to row after 100ms delay
- [x] Add scrollToRow function using data-row-id attribute + querySelector + scrollIntoView
- [x] Ensure row expansion updates expandedRows state for panel highlighting
- [x] Handle panel switching: when panel is open and "View flow" clicked for different correlationId, switch panel content
- [x] Add connectionInfo display in header (organization URL + API version)

## 5. Update ResultsTable Component
- [x] Add Actions column header to table (minWidth: 120px)
- [x] Add Actions cell with "View flow" Button (FlowRegular icon, subtle appearance, small size)
- [x] Pass onViewFlow callback from parent
- [x] Call onViewFlow(row.correlationid, row.plugintracelogid) when button clicked
- [x] Conditional render: only show button if correlationId exists
- [x] Add data-row-id attribute to table rows for scroll targeting
- [x] Update expanded row colspan from 9 to 10 to account for Actions column

## 6. Implement Table Navigation
- [x] Add scrollToRow(rowId) function in PluginTraceLogPage via handleNodeClick callback
- [x] Use querySelector with data-row-id attribute selector
- [x] Scroll row into view with smooth behavior and block: 'center'
- [x] Add 100ms setTimeout delay to ensure row expansion renders before scrolling
- [x] Ensure row is expanded when navigated via panel node click

## 7. Create Flow Visualization Styles
- [x] Define node styles with Fluent UI design tokens (tokens.colorNeutralBackground1, borderRadius, shadows)
- [x] Create exception indicator badge (red circular badge with "!" icon, positioned absolute top-right)
- [x] Style async vs sync mode differentiation (dashed border for Asynchronous, solid for Synchronous)
- [x] Style message display (fontSizeBase200, truncated to 15 chars with tooltip)
- [x] Style duration display with color-coded dots (green <1s, orange <5s, red ≥5s)
- [x] Node sizing: minWidth 200px, maxWidth 240px
- [x] Edge styling: 3px strokeWidth, bright colors, MarkerType.ArrowClosed (25x25)
- [x] Handle styling: 8x8 circles at Position.Left (target) and Position.Right (source)
- [x] React Flow configuration: nodesDraggable=false, nodesConnectable=false, selectNodesOnDrag=false
- [x] Ensure responsive layout within panel (60vw width, 100vh height)

## 8. Add Correlation-Specific Data Fetching
- [x] Verified existing `getPluginTraceLogs` supports filter parameter
- [x] Add correlation filter to service: `$filter=correlationid eq '{id}'`
- [x] Create `getLogsForCorrelation(baseUrl, correlationId)` helper function in pluginTraceLogService.ts
- [x] Set high page size (5000) to fetch all logs in one request for single correlation
- [x] Add error handling for fetch failures with try-catch in panel component
- [x] Return logs array directly (not paginated response)

## 9. Handle Edge Cases
- [x] Test with correlation containing 1 log (no edges)
- [x] Test with correlation containing 100+ logs (performance)
- [x] Test with missing correlationId (show error message)
- [x] Test with depth gaps (e.g., depth 0 → 2, skipping 1)
- [x] Test opening panel for different correlations rapidly (cancel pending fetches)
- [x] Test node click when row is already expanded
- [x] Test row expansion when panel is closed (no errors)
- [x] Test LRU cache eviction after 20 correlations

## 11. Component Testing
- [x] Test panel opening from row action
- [x] Test data fetching on panel open
- [x] Test loading state display
- [x] Test error state display
- [x] Test node click navigates to row
- [x] Test row expansion highlights node
- [x] Test panel switching to different correlationId
- [x] Test cache hit (no re-fetch on second open of same correlation)

## 12. Integration Testing
- [x] Test full flow: open panel → click node → verify row expanded and scrolled
- [x] Test bidirectional sync: expand row → verify node highlighted in panel
- [x] Test with real D365 correlation data (manual test)
- [x] Test with multi-depth execution chains (depth 0, 1, 2, 3)
- [x] Test with async and sync mixed operations
- [x] Test with exceptions at various depth levels

## 13. Documentation
- [x] Add JSDoc comments to buildFlowGraph function
- [x] Document FlowNode and FlowEdge interfaces
- [x] Add inline comments explaining positioning algorithm
- [x] Document panel state management and caching strategy
- [x] Update README if correlation flow is a major feature highlight
