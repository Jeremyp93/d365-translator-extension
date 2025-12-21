# Design: Bulk Translation Editing

**Change ID:** `add-bulk-translation-editing`
**Status:** Draft
**Date:** 2025-12-20

## Context

Currently, EntityAttributeBrowserPage allows users to translate entity attributes one at a time. When a user edits translations for an attribute and clicks "Save & Publish", the system immediately:
1. Calls `updateAttributeLabelsViaSoap()` for that single attribute
2. Calls `publishEntityViaWebApi()` to publish the entity
3. Returns control to the user

For users translating many attributes (e.g., 20+ fields across 3 entities), this results in:
- 20+ individual SOAP UpdateAttribute calls
- 20+ individual Publish calls (even if same entity)
- Long wait times between attributes
- No ability to review changes holistically

This design introduces a deferred-commit workflow where changes accumulate locally and are committed in a single batch operation.

## Goals

1. **Batch efficiency**: Reduce API calls by batching attribute updates and publishing entities only once
2. **User control**: Let users review all changes before committing
3. **Error resilience**: Handle partial failures gracefully with retry capability
4. **State preservation**: Don't lose changes when switching between entities
5. **Safety**: Warn users before losing unsaved work

## Non-Goals

- Undo/redo functionality (future enhancement)
- Offline editing (requires service worker)
- Conflict resolution for concurrent edits (rely on D365 last-write-wins)
- Visual diff highlighting in the translation table (just in review modal)

## Decisions

### 1. EntityLabelEditor Backward Compatibility

**Decision**: Create a new `BulkEntityLabelEditor` component or add optional `bulkMode` prop

**Rationale**:
- `EntityLabelEditor` is used in both EntityAttributeBrowserPage AND FieldReportPage
- FieldReportPage should keep the immediate-save workflow (no breaking changes)
- Two clean options:
  - **Option A**: Add `bulkMode?: boolean` prop to EntityLabelEditor, conditionally render "Save" vs "Add to Cart"
  - **Option B**: Create separate `BulkEntityLabelEditor` wrapper component

**Recommendation**: Use Option A (prop-based) for simplicity - single component, minimal duplication

**Implementation**:
```typescript
// EntityLabelEditor.tsx
interface Props {
  clientUrl: string;
  entity: string;
  attribute: string;
  bulkMode?: boolean; // NEW: enables bulk editing mode
  onAddToCart?: (changes: PendingChange[]) => void; // NEW: for bulk mode
}

// In FieldReportPage (existing behavior, no changes):
<EntityLabelEditor clientUrl={...} entity={...} attribute={...} />

// In EntityAttributeBrowserPage (new bulk mode):
<EntityLabelEditor
  clientUrl={...}
  entity={...}
  attribute={...}
  bulkMode={true}
  onAddToCart={handleAddToCart}
/>
```

**Alternatives considered**:
- **Duplicate component**: Would lead to maintenance burden
- **Break FieldReportPage**: Unacceptable, users rely on immediate save there

### 2. State Management: React Context vs Global Store

**Decision**: Use React Context API with a custom provider

**Rationale**:
- Changes are scoped to the EntityAttributeBrowser page
- No need for redux/zustand overhead for this isolated feature
- Context provides clean hook interface (`usePendingChanges`)
- Easy to test in isolation

**Alternatives considered**:
- **Local component state**: Would require prop drilling through multiple levels
- **Redux**: Overkill for page-scoped state
- **SessionStorage**: Would require serialization and lose type safety

### 2. Pending Changes Data Structure

**Decision**: Nested map structure for efficient lookup

```typescript
interface PendingChange {
  entity: string;
  attribute: string;
  languageCode: number;
  oldValue: string;
  newValue: string;
  timestamp: number; // For ordering
}

type PendingChangesMap = Map<string, PendingChange>;
// Key format: `${entity}|${attribute}|${lcid}`
```

**Rationale**:
- Fast O(1) lookup for duplicate edits to same field/language
- Easy to iterate for grouping by entity or attribute
- Key format prevents collisions and enables efficient updates
- Timestamp allows showing "most recent first" in UI

**Alternatives considered**:
- **Array of changes**: O(n) lookup for duplicates, harder to update
- **Nested object**: `{ [entity]: { [attr]: { [lcid]: value } } }` - complex traversal
- **Database (IndexedDB)**: Overkill, adds async complexity

### 3. Update Strategy: Web API vs SOAP

**Decision**: Migrate from SOAP UpdateAttribute to Web API PUT requests for attribute metadata

**Rationale**:
- **Modern approach**: Web API is the recommended approach for Dynamics 365 (SOAP is deprecated in Business Central 2025)
- **Performance**: OData/API web services are up to 10x faster than SOAP-based integrations
- **Consistency**: Already using Web API for reads, should use for writes too
- **Better batching**: $batch endpoint works natively with Web API PUT requests

**Implementation**:
```http
PUT /api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes(LogicalName='accountnumber') HTTP/1.1
MSCRM.MergeLabels: true
Content-Type: application/json

{
  "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
  "MetadataId": "abc-123-...",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      {"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Numéro de compte", "LanguageCode": 1036},
      {"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Account Number", "LanguageCode": 1033}
    ]
  }
}
```

**Migration Path**:
1. Create new `updateAttributeLabelsViaWebApi()` method in `entityLabelService.ts`
2. Use HTTP PUT to `EntityDefinitions(LogicalName='{entity}')/Attributes(LogicalName='{attribute}')`
3. Set `MSCRM.MergeLabels: true` header to preserve existing labels
4. Keep SOAP method as fallback if Web API fails

**Sources**:
- [Create and update column definitions using the Web API - Power Apps | Microsoft Learn](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-update-column-definitions-using-web-api)
- [Use the Web API with table definitions - Power Apps | Microsoft Learn](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/use-web-api-metadata)

**Alternatives considered**:
- **Keep using SOAP**: Deprecated, slower, no clear upgrade path
- **Organization Service SDK**: Requires .NET backend, not suitable for browser extension

### 4. Batch API Strategy

**Decision**: Use D365 $batch endpoint with Web API PUT requests

```http
POST /api/data/v9.2/$batch
Content-Type: multipart/mixed; boundary=batch_boundary

--batch_boundary
Content-Type: application/http
Content-Transfer-Encoding: binary

PUT /api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes(LogicalName='name') HTTP/1.1
MSCRM.MergeLabels: true
Content-Type: application/json

{...attribute metadata...}

--batch_boundary
Content-Type: application/http
Content-Transfer-Encoding: binary

PUT /api/data/v9.2/EntityDefinitions(LogicalName='contact')/Attributes(LogicalName='firstname') HTTP/1.1
MSCRM.MergeLabels: true
Content-Type: application/json

{...attribute metadata...}

--batch_boundary--
```

**Rationale**:
- Single HTTP request for all updates
- Reduces network overhead
- D365 officially supports $batch for Web API
- Works with PUT requests for metadata updates

**Alternatives considered**:
- **Promise.all parallel PUT calls**: Simpler implementation, more network overhead, still fast enough
- **Sequential PUT calls**: Too slow for large change sets
- **ExecuteMultiple with SOAP**: Requires Organization Service, not available via Web API

**Risk**: $batch implementation can be complex. If batch fails, we fall back to parallel Promise.all.

### 6. Review Modal UX

**Decision**: Shopping cart modal with old/new comparison

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Pending Changes (17)                              [✕]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ▼ Account (5 attributes)                                │
│   ├─ accountnumber                                       │
│   │  └─ French (1036): "Numéro" → "Numéro de compte"   │
│   │  └─ Spanish (1034): "" → "Número de cuenta"         │
│   ├─ name                                                │
│   │  └─ French (1036): "Nom" → "Nom du compte"          │
│   ...                                                    │
│                                                          │
│ ▼ Contact (3 attributes)                                 │
│   ├─ firstname                                           │
│   │  └─ French (1036): "Prénom" → "Premier prénom"      │
│   ...                                                    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ [Clear All]                        [Cancel]  [Save All] │
└─────────────────────────────────────────────────────────┘
```

**Rationale**:
- Grouped by entity for clarity (users think in entities)
- Old → New format makes changes obvious
- Expandable sections for large change sets
- Follows familiar e-commerce cart pattern

**Alternatives considered**:
- **Flat list**: Hard to scan for large change sets
- **Table view**: Doesn't group well, harder to read
- **Side panel**: User specifically requested modal

### 5. Entity Publish Strategy

**Decision**: Use single PublishXml call with multiple entities in ParameterXml

**Flow**:
1. Extract unique entity names from pending changes
2. Execute batch update for all attributes
3. Build single XML with all affected entities:
```xml
<importexportxml>
  <entities>
    <entity>account</entity>
    <entity>contact</entity>
    <entity>lead</entity>
  </entities>
</importexportxml>
```
4. Call `publishEntityViaWebApi()` once with multi-entity XML

**Implementation**:
```typescript
async function publishMultipleEntities(baseUrl: string, entityNames: string[]): Promise<void> {
  const entities = entityNames.map(e => `<entity>${e}</entity>`).join('');
  const parameterXml = `<importexportxml><entities>${entities}</entities></importexportxml>`;

  await fetchJson(`${baseUrl}/api/data/v9.2/PublishXml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ParameterXml: parameterXml }),
  });
}
```

**Rationale**:
- **Single API call** instead of multiple parallel calls
- Reduces network overhead and API throttling risk
- D365 PublishXml action supports multiple entities in single ParameterXml
- Atomic publish operation for all affected entities

**Sources**:
- [Publish customizations | Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/customerengagement/on-premises/developer/customize-dev/publish-customizations?view=op-9-1)
- [Programmatically Publish Customizations in Dynamics CRM](https://www.inogic.com/blog/2016/10/programmatically-publish-customizations-in-dynamics-crm/)

**Alternatives considered**:
- **Parallel publishes with Promise.all**: More API calls, higher risk of throttling
- **Sequential publishes**: Too slow for multiple entities
- **ExecuteMultipleRequest**: Requires Organization Service, not available via Web API

**Risk**: If publish fails, all attribute updates are committed but not visible. Mitigation: Show clear error with retry option, explain that changes are saved but not published yet.

### 7. Partial Failure Handling

**Decision**: Show summary, remove successful changes from cart, keep failed for retry

**Flow**:
1. Parse $batch response (or Promise.allSettled results)
2. Separate successful vs failed updates
3. Remove successful changes from `PendingChangesMap`
4. Show notification: "15 attributes saved, 2 failed. Review failures below."
5. Failed items remain in cart with error details
6. User can fix and retry

**Rationale**:
- Users don't want to re-enter successful changes
- Failed items need attention and context
- Retry is simple (same "Save All" button)

**Alternatives considered**:
- **Roll back all on any failure**: Complex, D365 doesn't support true transactions across attributes
- **Remove all on partial failure**: Frustrating for users, lose failed context

### 8. Unsaved Changes Protection

**Decision**: Use `beforeunload` for page close + custom prompt for navigation

**Implementation**:
```typescript
// Browser close/refresh
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (pendingChanges.size > 0) {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires this
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [pendingChanges.size]);

// React Router navigation (if integrated)
// Use useBlocker or usePrompt from react-router-dom v6
```

**Rationale**:
- Standard web pattern for unsaved changes
- Prevents accidental data loss
- `beforeunload` works for tab close, refresh, browser close
- Custom prompt for in-app navigation

## Risks / Trade-offs

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| $batch API failure | Medium | High | Implement fallback to parallel Promise.all |
| Memory usage with 100+ changes | Low | Medium | Limit to 200 pending changes, show warning |
| Lost changes on crash | Low | Medium | Document that changes are in-memory only; future: add sessionStorage backup |
| Concurrent edits to same attr | Low | Low | Last save wins (D365 behavior), show timestamp in modal |
| Batch request too large | Low | Medium | Split into multiple batches of 50 updates each |
| Publish throttling | Medium | Low | Add retry with exponential backoff |

## Migration Plan

No migration needed - this is a new feature. Existing immediate-save workflow continues to work as-is.

**Rollout**:
1. Deploy with feature flag (if framework exists)
2. Beta test with 2-3 internal users
3. Monitor for errors in batch API calls
4. Full release

**Rollback**:
- If $batch endpoint issues arise, disable batching and fall back to sequential saves
- No data migration concerns

## Performance Considerations

### Expected Load
- Typical use case: 10-30 pending changes
- Heavy use case: 50-100 pending changes
- Max supported: 200 pending changes (show warning at 150)

### Optimization Targets
- Add to cart: <10ms (simple Map.set)
- Open modal: <100ms (even with 100 changes)
- Batch save: <5s for 50 attributes
- Publish: <2s per entity

### Batch Size Strategy
If >50 pending changes, split into multiple batch requests of 50 each to avoid:
- Request size limits
- Timeout issues
- Memory pressure in D365

## Open Questions

1. **Should we persist pending changes to sessionStorage?**
   - **Recommendation**: Not in v1, add if users request it. Adds complexity (serialization, hydration, stale data).

2. **How to handle duplicate language edits (user edits French twice)?**
   - **Decision**: Map key ensures latest edit wins. Show timestamp in review modal.

3. **Should "Add to Cart" be automatic or require button click?**
   - **Decision**: Automatic on any translation input change (debounced 500ms). Simpler UX, matches shopping cart mental model.

4. **Limit on number of pending changes?**
   - **Decision**: Soft limit at 150 (show warning), hard limit at 200 (disable adding more).

5. **Should we show a diff in the translation table itself (not just modal)?**
   - **Decision**: No in v1 (user said "no indicators"). Could add in v2 if requested.

## Dependencies

- Existing `entityLabelService.ts` for individual SOAP calls
- Existing `publishEntityViaWebApi` for publishing
- D365 Web API $batch endpoint (or fallback to parallel requests)
- Fluent UI v9 components: Modal, Button, Badge, Text
- React 18 hooks: useContext, useState, useEffect

## Success Criteria

1. Users can edit 20 attributes without any API calls until "Save All"
2. Batch save completes in <5 seconds for 20 attributes
3. Partial failures are clearly communicated with retry option
4. Unsaved changes warning prevents accidental data loss
5. Cart modal shows clear old → new comparison
6. No performance degradation with 50+ pending changes
7. Entity switching preserves all pending changes
