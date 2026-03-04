# Correlation ID Color Stripes + Group-by-Correlation Toggle

**Date:** 2026-02-25
**Feature:** Plugin Trace Viewer — visual grouping by correlation ID

## What we're building

Two related features for the Plugin Trace Log table:

1. **Color stripes**: A colored left border on each row. Rows sharing the same `correlationId` get the same deterministic color, always visible.
2. **Group-by-correlation toggle**: A toggle button that reorders the table to group rows by correlation ID, sorted chronologically.

## Feature 1: Color Stripes

### New utility: `src/utils/correlationColors.ts` (~30 LOC)

- Pure function `getCorrelationColor(correlationId: string): string`
- Uses a simple string hash (djb2) mapped to ~16 evenly-spaced HSL hues at fixed saturation (60%) and lightness (55%)
- Returns a CSS color string, e.g. `hsl(210, 60%, 55%)`
- Traces with no correlation ID get no stripe

### Changes to `ResultsTableRow.tsx`

- Import `getCorrelationColor`
- Apply `4px solid <color>` left border on `<tr>` when `log.correlationid` exists
- Use `4px solid transparent` when no correlation ID (alignment consistency)

### No changes needed to:

- `ResultsTable.tsx` — no new props, correlation ID already on each `log`
- `usePluginTraceLogs.ts` — data already includes `correlationid`
- `pluginTraceLogService.ts` — already fetches the field

## Feature 2: Group-by-Correlation Toggle

### UX

Toggle button in the filter/toolbar area. When enabled:

1. Rows grouped by `correlationId`
2. Within each group: sorted by `createdon` ascending (execution order)
3. Groups ordered by earliest `createdon` descending (newest group first)
4. Logs with no correlation ID appear ungrouped at the end
5. Manual column sorting is disabled while grouping is active

When disabled (default): flat list with current sorting behavior.

### Changes to `usePluginTraceLogs.ts`

- New `groupByCorrelation` boolean state + toggle function
- New `groupedLogs` useMemo that groups, sorts within/across groups, and flattens
- Expose toggle state and setter to the page component

### Changes to `PluginTraceLogPage.tsx`

- Add a Fluent UI `ToggleButton` in the filter area
- Pass `isGrouped` state to `ResultsTable`

### Changes to `ResultsTable.tsx`

- Accept `isGrouped` prop
- When grouped: disable sort click handlers on column headers
- When grouped: use the grouped log order instead of local sort

### Changes to `ResultsTableRow.tsx`

- Accept optional `isLastInGroup` prop
- When true: render a thicker bottom border to visually separate groups

## Edge Cases

- **No correlation ID**: transparent border, appears at end when grouped
- **Many unique IDs**: ~16 hues means some groups may share colors — acceptable as visual aid
- **Dark/light themes**: HSL 60%/55% works reasonably in both contexts
- **Single-item groups**: still get a color stripe; no separator needed

## Not Building

- No enable/disable toggle for color stripes (always on)
- No color legend
- No hover-to-highlight-all-matching behavior
