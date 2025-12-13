# Design Document: Correlation Flow Visualization

## Purpose
This document details key technical decisions and design rationale for implementing the correlation flow visualization feature.

## Why This Design Document?
This change warrants a dedicated design document because:
- **External Dependency**: Introducing React Flow library requires justification and integration strategy
- **Cross-Cutting Change**: Affects multiple components (table, panel, services) requiring coordination
- **Bidirectional Sync**: Complex state management between diagram and table requires clear contract
- **Performance Considerations**: Rendering/caching strategy for 100+ node graphs
- **Positioning Algorithm**: Non-trivial deterministic layout logic needs documentation

## 1. Visualization Library Selection

### Decision: React Flow
We chose React Flow over alternatives for these reasons:

**Why React Flow?**
- Built-in pan/zoom/selection interactions
- Node/edge customization through React components
- Active maintenance and TypeScript support
- Handles layout calculations and viewport management
- Accessible and performant

**Alternatives Considered:**
- **D3.js**: More powerful but lower-level, requires manual interaction handling
- **Custom SVG**: Full control but significant development overhead for pan/zoom
- **Cytoscape.js**: Graph-focused but less React-friendly

**Decision Rationale:** React Flow provides the right balance of functionality and integration ease for our swimlane diagram requirements.

## 2. Node Positioning Algorithm

### Advanced Deterministic Layout Strategy
We use a formula-based approach with intelligent overlap prevention:

```
x = compactDepth * LANE_WIDTH
y = calculated with anti-overlap algorithm
```

**Why Formula-Based with Overlap Prevention?**
- Predictable, consistent positioning
- Depth directly maps to swimlane (visual clarity)
- Execution order preserved by Y-axis
- No layout stabilization delay
- Prevents node overlapping when multiple operations share same timestamp

**Constants:**
- `LANE_WIDTH = 350px` (enough for type name + metadata + padding)
- `ROW_SPACING = 200px` (vertical space between operations)

**Advanced Positioning Algorithm:**
1. **Sort logs** by timestamp, then depth, then message name for stability
2. **Track state**:
   - `nextYByDepth` Map<number, number>: next available Y position per depth
   - `maxYGlobal`: highest Y position used across all depths
3. **Apply positioning rules**:
   - Same timestamp + same depth → stack vertically at nextYByDepth[depth]
   - Same timestamp + different depth → align horizontally at maxYGlobal
   - Different timestamp → start new row at maxYGlobal + ROW_SPACING
4. **Compact depth lanes**: Map sparse depths (e.g., {1,3}) to consecutive lanes (e.g., {0,1})

**Edge Routing:**
- Sequence edges (same depth): straight lines between consecutive nodes
- Parent-child edges (depth changes): intelligent scoring-based detection with smoothstep routing

## 3. Data Model and Graph Structure

### FlowNode Interface
```typescript
interface FlowNode {
  id: string;                    // plugintracelogid (unique)
  type: 'default';               // Custom node type
  position: { x: number; y: number };
  data: {
    traceid: string;             // plugintracelogid
    typeName: string;            // Display label (plugin class name)
    message: string;             // Message name (Create, Update, etc.)
    stage: string;               // PreValidation | PreOperation | PostOperation
    mode: string;                // Synchronous | Asynchronous
    duration: number;            // Execution time in ms
    hasException: boolean;       // Error indicator
    depth: number;               // Depth level for display
  };
}
```

### FlowEdge Interface
```typescript
interface FlowEdge {
  id: string;                    // Unique edge ID
  source: string;                // Source node plugintracelogid
  target: string;                // Target node plugintracelogid
  type: 'smoothstep' | 'straight'; // Edge routing type
  animated: boolean;             // Visual feedback for active paths
  data: {
    type: 'sequence' | 'parent-child';
  };
  style: {                       // Edge visual styling
    stroke: string;              // Edge color
    strokeWidth: number;         // 3px
    strokeDasharray?: string;    // '8,4' for parent-child
  };
  markerEnd: {                   // Arrow configuration
    type: MarkerType.ArrowClosed;
    width: 25;
    height: 25;
    color: string;
  };
  label: string;                 // 'calls' or 'then'
}
```

### Graph Building Logic
The `buildFlowGraph` function uses intelligent algorithms:
1. **Sort** by timestamp, depth, message (stability)
2. **Position nodes** with overlap prevention algorithm
3. **Compact depth lanes** to skip gaps
4. **Create sequence edges** between consecutive nodes at same depth
5. **Create parent-child edges** using scoring heuristic:
   - Score candidates based on typename match, message match, depth difference, time proximity
   - Require parent to be shallower, earlier/same time, same namespace prefix
   - Apply MAX_PARENT_TIME_DIFF_MS threshold (120 seconds)
   - Select highest-scoring candidate above minimum threshold
6. Return `{ nodes, edges }`

## 4. State Management

### Single Source of Truth
The PluginTraceLogPage maintains the canonical state:
- `selectedRowId: string | null` - Currently selected row (single selection)
- `expandedRowIds: Set<string>` - All expanded rows (multi-expansion)
- `isPanelOpen: boolean` - Panel visibility
- `panelCorrelationId: string | null` - Current panel correlation

### State Flow
```
User Action → State Update → Props Update → Component Re-render
```

**Bidirectional Sync Contract:**
1. **Panel → Table**: Node click → `onNodeClick(rowId)` → `setSelectedRowId(rowId)` + `scrollToRow(rowId)` + `expandRow(rowId)`
2. **Table → Panel**: Row expand → `setExpandedRowIds(prev => new Set([...prev, rowId]))` → Panel re-renders with highlighted nodes

### Panel Switching Rules
- Explicit "View flow" click → switch `panelCorrelationId` (keeps panel open)
- Row expansion → does NOT auto-switch panel (user must click "View flow")
- Panel close → clear `panelCorrelationId`, keep `isPanelOpen = false`

## 5. Caching Strategy

### In-Memory Session Cache
We implement an LRU (Least Recently Used) cache for fetched correlation data:

**Cache Key:** `correlationId`  
**Cache Value:** `{ nodes: FlowNode[], edges: FlowEdge[], timestamp: number }`  
**Max Size:** 20 correlations  
**Eviction:** LRU when exceeding max size  
**Invalidation:** Clear on filter changes (date range, entity, etc.)

**Rationale:**
- Session-level cache sufficient (no persistence needed)
- 20 correlations covers typical troubleshooting session
- LRU ensures most relevant data retained
- Invalidation on filter prevents stale data

**Implementation:** Simple Map with access tracking, no external library needed for this scale.

## 6. Data Fetching Strategy

### On-Demand Loading
We fetch correlation data only when panel opens:

```typescript
useEffect(() => {
  if (isPanelOpen && panelCorrelationId) {
    // Check cache first
    if (cache.has(panelCorrelationId)) {
      setFlowData(cache.get(panelCorrelationId));
      return;
    }
    
    // Fetch from D365
    setLoading(true);
    fetchCorrelationLogs(panelCorrelationId)
      .then(logs => {
        const flowData = buildFlowGraph(logs);
        cache.set(panelCorrelationId, flowData);
        setFlowData(flowData);
      })
      .finally(() => setLoading(false));
  }
}, [isPanelOpen, panelCorrelationId]);
```

**Why On-Demand?**
- Most rows never have their flow viewed (performance optimization)
- Correlation data can be large (100+ operations)
- Cache mitigates repeated fetch overhead
- Fits user mental model (explicit "View flow" action)

## 7. UI Component Hierarchy

```
PluginTraceLogPage
├── Filters (existing)
├── ResultsTable (existing)
│   └── Row Actions
│       └── "View flow" button [NEW]
└── CorrelationFlowPanel [NEW]
    ├── Panel Header
    │   ├── Correlation ID display
    │   └── Close button
    ├── Loading Spinner (conditional)
    ├── Error Message (conditional)
    └── React Flow Component
        ├── Nodes (custom styled)
        └── Edges
```

## 8. Visual Design Specifications

### Node Styling
- **Base Style**: Rounded rectangle (borderRadiusMedium), Fluent UI neutral background
- **Size**: minWidth 200px, maxWidth 240px
- **Selected State**: 2px blue border (colorBrandStroke1), colorBrandBackground2
- **Exception State**: 2px red border (colorPaletteRedBorder1), colorPaletteRedBackground1
- **Exception Indicator**: Red circular badge with "!" icon (absolute positioned top-right, -8px/-8px)
- **Mode Distinction**: Dashed border for Asynchronous, solid for Synchronous
- **Handles**: 8x8 circles at left (target) and right (source) for edge connections
- **Shadow**: shadow4 normal, shadow8 when selected

### Node Content Layout
```
┌─────────────────────────────────┐[!]← Red badge
│ TypeName (truncated 35 chars)   │
├─────────────────────────────────┤
│ ● Duration: 123ms              │← Color-coded dot
│ Message (15 char) | Depth | (A)│← Truncated message
└─────────────────────────────────┘
```

**Duration Color Coding:**
- Green: < 1000ms
- Orange: 1000-5000ms
- Red: ≥ 5000ms

### Handle Components (Critical for Edge Rendering)
- **Target Handle**: Position.Left, 8x8, colorNeutralStroke1 background
- **Source Handle**: Position.Right, 8x8, colorNeutralStroke1 background
- Required for React Flow edge attachment

### Edge Styling
- **Sequence Edges**: 
  - Type: straight
  - Stroke: colorNeutralForeground1
  - Width: 3px
  - Label: "then"
- **Parent-Child Edges**: 
  - Type: smoothstep
  - Stroke: colorBrandForeground1
  - Width: 3px
  - Dash: 8,4
  - Label: "calls"
- **Arrow Markers**: MarkerType.ArrowClosed, 25x25
- **No Animation**: animated=false (performance)

## 9. Performance Considerations

### Rendering Optimization
- React Flow handles virtualization automatically (only renders visible nodes)
- Throttle panel state updates (avoid re-render on every scroll)
- Memoize `buildFlowGraph` with useMemo when data unchanged

### Large Correlation Handling
For correlations with 500+ operations:
- React Flow's built-in viewport virtualization handles rendering
- Graph building is O(n) complexity, acceptable for n < 1000
- If performance issues: consider pagination within panel (future enhancement)

### Memory Management
- LRU cache limits memory growth to 20 correlations
- Each cached flow: ~50KB average (100 nodes * 500 bytes per node)
- Total cache memory: ~1MB worst case (acceptable)

## 10. Testing Strategy

### Unit Tests (Jest)
- `buildFlowGraph`: Test node/edge creation with various depth patterns
- Position calculation: Verify formula correctness
- Edge type determination: Sequence vs parent-child logic

### Component Tests (React Testing Library)
- Panel opening/closing
- Data fetching and loading states
- Node click callback invocation
- Cache hit/miss scenarios

### Integration Tests
- Full bidirectional sync: node click → row scroll → row expand → node highlight
- Panel switching between different correlations
- Error handling with invalid correlationId

### Manual Testing Scenarios
- Real D365 data with complex multi-depth chains
- Async operations triggering child operations
- Exception handling at various depths
- Large correlations (100+ operations)

## 11. Future Enhancements

### Potential Improvements (Out of Scope for Initial Implementation)
- **Minimap**: Overview of large graphs (React Flow built-in)
- **Search/Filter**: Highlight specific operation types
- **Path Highlighting**: Show critical path or error propagation
- **Export**: Save diagram as image or JSON
- **Zoom to Fit**: Auto-scale to show entire graph
- **Collapsible Depth Lanes**: Hide lanes to simplify view

## 12. Risk Mitigation

### Identified Risks and Mitigations

**Risk: React Flow Bundle Size**
- Mitigation: Code splitting, lazy load panel component
- Impact: +200KB gzipped (acceptable for enterprise extension)

**Risk: Complex Sync Logic Bugs**
- Mitigation: Comprehensive component tests, strict TypeScript
- Clear contract documentation in code comments

**Risk: Performance with Very Large Correlations (1000+ ops)**
- Mitigation: React Flow virtualization, future pagination if needed
- Current scope handles 500 operations smoothly

**Risk: Positioning Conflicts with Concurrent Operations**
- Mitigation: Y-axis uses index order, not timestamps (deterministic)
- If same timestamp: sort by traceid as tiebreaker

## 13. Accessibility

### ARIA and Keyboard Support
- React Flow provides keyboard navigation out of the box
- Panel close button has proper ARIA label
- Node selection state announced to screen readers
- Focus management when navigating from node to table row

### Visual Accessibility
- Sufficient color contrast for nodes and edges
- Exception indicators use icon + color (not color alone)
- Focus indicators visible with keyboard navigation

## 14. Implementation Sequence

### Phase 1: Foundation
1. Install React Flow dependency
2. Create flowGraphBuilder utility with tests
3. Define interfaces and types

### Phase 2: Panel Component
4. Build CorrelationFlowPanel with static mock data
5. Implement data fetching and caching
6. Add loading and error states

### Phase 3: Integration
7. Add "View flow" action to table
8. Connect panel state to PluginTraceLogPage
9. Implement node click → row navigation

### Phase 4: Bidirectional Sync
10. Add row expansion → node highlight
11. Test full sync behavior
12. Handle edge cases

### Phase 5: Polish
13. Refine visual styling
14. Performance testing
15. Documentation
