# Correlation ID Color Stripes + Group Toggle — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add colored left-border stripes to Plugin Trace Log rows grouped by correlation ID, plus a toggle to reorder rows into correlation groups.

**Architecture:** New pure utility for deterministic color hashing. Hook exposes grouping state + derived sorted array. Table and row components consume grouping props for visual treatment. No service changes needed — correlationId is already fetched.

**Tech Stack:** React 18, TypeScript, Fluent UI v9 (`makeStyles`, `ToggleButton`), HSL color generation

**Note:** No test framework is configured. Manual testing by loading extension in Chrome.

---

### Task 1: Create correlation color utility

**Files:**
- Create: `src/utils/correlationColors.ts`

**Step 1: Create the utility file**

```typescript
/**
 * Deterministic color assignment for correlation IDs.
 * Uses djb2 hash to map IDs to one of 16 evenly-spaced HSL hues.
 */

const HUE_COUNT = 16;
const SATURATION = 60;
const LIGHTNESS = 55;

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Returns a deterministic HSL color string for a given correlation ID.
 * Same ID always produces the same color.
 */
export function getCorrelationColor(correlationId: string): string {
  const hash = djb2Hash(correlationId);
  const hue = (hash % HUE_COUNT) * (360 / HUE_COUNT);
  return `hsl(${hue}, ${SATURATION}%, ${LIGHTNESS}%)`;
}
```

**Step 2: Verify no lint/type errors**

Run: `npx tsc --noEmit`
Expected: No errors related to the new file

**Step 3: Commit**

```
feat: add correlation ID color utility

Deterministic djb2 hash maps correlation IDs to 16 HSL hues.
```

---

### Task 2: Add color stripe to table rows

**Files:**
- Modify: `src/components/plugin-trace/ResultsTableRow.tsx`

**Step 1: Import the utility**

At the top of `ResultsTableRow.tsx`, add:

```typescript
import { getCorrelationColor } from "../../utils/correlationColors";
```

**Step 2: Apply left border style on the `<tr>` element**

In the `ResultsTableRow` function, compute the border style and apply it to the `<tr>`:

```typescript
const borderColor = log.correlationid
  ? getCorrelationColor(log.correlationid)
  : "transparent";
```

Change the `<tr>` from:

```tsx
<tr data-row-id={log.plugintracelogid} className={styles.tableRow}>
```

To:

```tsx
<tr
  data-row-id={log.plugintracelogid}
  className={styles.tableRow}
  style={{ borderLeft: `4px solid ${borderColor}` }}
>
```

This is a truly dynamic value (computed per-row from data), so inline style is appropriate here.

**Step 3: Verify no lint/type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat: add correlation ID color stripe to trace log rows

Left border colored by deterministic hash of correlationId.
Transparent border when no correlation ID for alignment.
```

---

### Task 3: Add grouping logic to the hook

**Files:**
- Modify: `src/hooks/usePluginTraceLogs.ts`

**Step 1: Add grouping state and derived memo**

After the existing `filteredLogs` memo (around line 121), add:

```typescript
// Correlation grouping
const [groupByCorrelation, setGroupByCorrelation] = useState(false);

const toggleGroupByCorrelation = useCallback(() => {
  setGroupByCorrelation(prev => !prev);
}, []);

/**
 * When grouping is active, reorder logs:
 * 1. Group by correlationId
 * 2. Within each group: sort by createdon ascending
 * 3. Groups ordered by earliest createdon descending
 * 4. Logs without correlationId go to the end
 */
const displayLogs = useMemo(() => {
  if (!groupByCorrelation) return filteredLogs;

  const grouped = new Map<string, PluginTraceLog[]>();
  const ungrouped: PluginTraceLog[] = [];

  for (const log of filteredLogs) {
    if (log.correlationid) {
      const group = grouped.get(log.correlationid);
      if (group) {
        group.push(log);
      } else {
        grouped.set(log.correlationid, [log]);
      }
    } else {
      ungrouped.push(log);
    }
  }

  // Sort within each group by createdon ascending
  for (const group of grouped.values()) {
    group.sort((a, b) => new Date(a.createdon).getTime() - new Date(b.createdon).getTime());
  }

  // Sort groups by earliest createdon descending
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    const aEarliest = new Date(a[1][0].createdon).getTime();
    const bEarliest = new Date(b[1][0].createdon).getTime();
    return bEarliest - aEarliest;
  });

  // Flatten: grouped logs first, then ungrouped
  const result: PluginTraceLog[] = [];
  for (const [, group] of sortedGroups) {
    result.push(...group);
  }
  result.push(...ungrouped);

  return result;
}, [filteredLogs, groupByCorrelation]);
```

**Step 2: Update the return interface**

In the `UsePluginTraceLogsResult` interface, add:

```typescript
// Grouping
groupByCorrelation: boolean;
toggleGroupByCorrelation: () => void;
displayLogs: PluginTraceLog[];
```

**Step 3: Update the return object**

In the return statement, add the new fields:

```typescript
groupByCorrelation,
toggleGroupByCorrelation,
displayLogs,
```

**Step 4: Verify no lint/type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
feat: add group-by-correlation logic to usePluginTraceLogs

Adds toggle + derived displayLogs that groups and sorts by
correlation ID when active.
```

---

### Task 4: Add group separator to table rows

**Files:**
- Modify: `src/components/plugin-trace/ResultsTableRow.tsx`

**Step 1: Add `isLastInGroup` prop**

Update the `ResultsTableRowProps` interface:

```typescript
interface ResultsTableRowProps {
  log: PluginTraceLog;
  isExpanded: boolean;
  typeNameWidth: number;
  onToggleRow: (rowId: string) => void;
  onViewFlow?: (correlationId: string, rowId: string) => void;
  isLastInGroup?: boolean;
}
```

**Step 2: Destructure and apply**

Add `isLastInGroup` to the destructured props:

```typescript
function ResultsTableRow({
  log,
  isExpanded,
  typeNameWidth,
  onToggleRow,
  onViewFlow,
  isLastInGroup,
}: ResultsTableRowProps) {
```

Update the `<tr>` style to include the group separator:

```tsx
<tr
  data-row-id={log.plugintracelogid}
  className={styles.tableRow}
  style={{
    borderLeft: `4px solid ${borderColor}`,
    ...(isLastInGroup && { borderBottom: `3px solid ${tokens.colorNeutralStroke1}` }),
  }}
>
```

Note: `tokens.colorNeutralStroke1` must be imported — it already is (from the existing `makeStyles` imports at the top of the file).

**However**, `tokens` is used inside `makeStyles` at compile time, not at runtime in JSX. For the inline style, use a CSS variable approach or a simple neutral color. Since `tokens` values resolve to CSS custom properties at runtime in Fluent UI v9, we can use it directly in makeStyles but not reliably in inline styles.

**Better approach:** Add a new class to `useStyles`:

```typescript
groupSeparator: {
  borderBottom: `3px solid ${tokens.colorNeutralStroke1}`,
},
```

Then conditionally apply it:

```tsx
<tr
  data-row-id={log.plugintracelogid}
  className={`${styles.tableRow}${isLastInGroup ? ` ${styles.groupSeparator}` : ''}`}
  style={{ borderLeft: `4px solid ${borderColor}` }}
>
```

**Step 3: Verify no lint/type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat: add group separator border to last row in correlation group
```

---

### Task 5: Wire up grouping in ResultsTable

**Files:**
- Modify: `src/components/plugin-trace/ResultsTable.tsx`

**Step 1: Add `isGrouped` prop**

Update `ResultsTableProps`:

```typescript
export interface ResultsTableProps {
  logs: PluginTraceLog[];
  onSortChange?: (
    sortColumn: TableColumnId | undefined,
    sortDirection: "ascending" | "descending"
  ) => void;
  onViewFlow?: (correlationId: string, rowId: string) => void;
  expandedRows: Set<string>;
  onToggleRow: (rowId: string) => void;
  isGrouped?: boolean;
}
```

Add `isGrouped` to the destructured props in the component.

**Step 2: Disable sorting when grouped**

Wrap the sort click handlers so they no-op when `isGrouped` is true. In each `<th onClick={...}>`, change from:

```tsx
onClick={() => handleSortChange({...})}
```

To:

```tsx
onClick={isGrouped ? undefined : () => handleSortChange({...})}
style={isGrouped ? { cursor: 'default' } : undefined}
```

Apply this to all 4 sortable headers: Type Name, Message, Duration, Created On.

**Step 3: Skip local sorting when grouped**

The `sortedLogs` memo should pass through the input when grouped (the hook already handles ordering):

```typescript
const sortedLogs = useMemo(() => {
  if (isGrouped) return logs;
  if (!sortState.sortColumn) return logs;
  // ... rest unchanged
}, [logs, sortState, columns, isGrouped]);
```

**Step 4: Compute `isLastInGroup` and pass to rows**

In the `<tbody>` mapping, compute whether each row is the last in its correlation group:

```tsx
{sortedLogs.map((log, index) => {
  const isExpanded = expandedRows.has(log.plugintracelogid);
  const nextLog = sortedLogs[index + 1];
  const isLastInGroup = isGrouped &&
    !!log.correlationid &&
    (!nextLog || nextLog.correlationid !== log.correlationid);

  return (
    <ResultsTableRow
      key={log.plugintracelogid}
      log={log}
      isExpanded={isExpanded}
      typeNameWidth={typeNameWidth}
      onToggleRow={toggleRow}
      onViewFlow={onViewFlow}
      isLastInGroup={isLastInGroup}
    />
  );
})}
```

**Step 5: Verify no lint/type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```
feat: wire grouping into ResultsTable

Disables column sorting when grouped, passes isLastInGroup
to rows for visual separation.
```

---

### Task 6: Add toggle button to the page

**Files:**
- Modify: `src/report/pages/PluginTraceLogPage.tsx`

**Step 1: Import ToggleButton and icon**

Add to the existing Fluent UI imports:

```typescript
import { ToggleButton } from "@fluentui/react-components";
import { GroupListRegular } from "@fluentui/react-icons";
```

**Step 2: Destructure new hook fields**

In the `usePluginTraceLogs` destructuring, add:

```typescript
groupByCorrelation,
toggleGroupByCorrelation,
displayLogs,
```

**Step 3: Add toggle button in the results header**

In the `resultsHeader` div (around line 271-287), add the toggle button next to the existing "Infinite scroll" checkbox:

```tsx
<div className={styles.resultsHeader}>
  <Text weight="semibold" size={500}>
    {/* ... existing results count text ... */}
  </Text>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <ToggleButton
      appearance="subtle"
      icon={<GroupListRegular />}
      checked={groupByCorrelation}
      onClick={toggleGroupByCorrelation}
      size="small"
    >
      Group by correlation
    </ToggleButton>
    <Checkbox
      label="Infinite scroll"
      checked={infiniteScrollEnabled}
      onChange={(_, data) =>
        setInfiniteScrollEnabled(data.checked === true)
      }
      disabled={!isDefaultSort || !!searchQuery || groupByCorrelation}
    />
  </div>
</div>
```

Note: Infinite scroll is also disabled when grouping is active (grouping reorders client-side, which conflicts with server-ordered infinite scroll).

**Step 4: Pass `displayLogs` and `isGrouped` to ResultsTable**

Change `filteredLogs` to `displayLogs` in the ResultsTable usage, and add `isGrouped`:

```tsx
<ResultsTable
  ref={resultsTableRef}
  logs={displayLogs}
  onSortChange={handleTableSortChange}
  onViewFlow={handleViewFlow}
  expandedRows={expandedRows}
  onToggleRow={handleToggleRow}
  isGrouped={groupByCorrelation}
/>
```

Also update the results count display to use `displayLogs.length` where `filteredLogs.length` was used, and the empty-state checks.

**Step 5: Update infinite scroll sentinel condition**

The sentinel and sort notice should also account for grouping:

```tsx
{/* Sort notice — also show when grouping is active */}
{!loading && !error && displayLogs.length > 0 && groupByCorrelation && hasMore && (
  <div className={styles.sortNotice}>
    <Text>
      Infinite scroll is disabled when grouping by correlation.
    </Text>
  </div>
)}
```

Update the existing sort notice condition to exclude when grouped (to avoid showing two notices):

```tsx
!isDefaultSort && !groupByCorrelation && hasMore
```

**Step 6: Verify no lint/type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Build and verify**

Run: `npm run build`
Expected: Successful build with no errors

**Step 8: Commit**

```
feat: add group-by-correlation toggle to Plugin Trace Log page

ToggleButton in results header groups traces by correlation ID.
Disables infinite scroll and manual sorting when active.
```

---

## Manual Testing Checklist

After all tasks are complete, load `dist/` as unpacked extension in Chrome and test against a D365 environment:

1. **Color stripes visible**: Each trace row shows a colored left border
2. **Same correlation = same color**: Rows with the same correlation ID have matching border colors
3. **No correlation = no stripe**: Rows without correlation ID have no visible border
4. **Toggle off (default)**: Table sorts normally, all column headers clickable
5. **Toggle on**: Rows regroup by correlation, newest groups first, chronological within groups
6. **Group separators**: Thicker border between different correlation groups when toggle is on
7. **Sort headers disabled**: Column sort indicators don't respond to clicks when grouped
8. **Infinite scroll disabled**: Checkbox grayed out when grouping is active
9. **Toggle off again**: Returns to normal flat view with previous sort
10. **Theme compatibility**: Stripes visible on both light and dark themes
