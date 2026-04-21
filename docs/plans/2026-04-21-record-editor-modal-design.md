# Record Editor Modal — Design

**Date:** 2026-04-21
**Status:** Approved — ready for implementation plan

## Summary

A modal overlay launched from the extension popup that lets the user view every attribute of the currently-opened D365 record, edit supported types, and PATCH only the changed fields back to D365. System/unsupported fields are shown read-only so the user still sees their values.

## Scope (from brainstorming)

- **Field scope:** every attribute from metadata (scope C). System fields are read-only but visible.
- **Trigger:** button in the extension popup.
- **Editable types:** String, Memo, Integer, Decimal, Double, Money, Boolean, DateTime, Picklist, State/Status (Picklist), Lookup (raw GUID input).
- **Out of MVP:** Lookup picker (autocomplete), Multi-select Picklist, Customer, Owner, File/Image, PartyList.
- **Save semantics:** single PATCH with only dirty fields; `If-Match` ETag for optimistic concurrency; auto-refresh D365 form on success.

## Architecture

```
┌──────────┐  OPEN_RECORD_EDITOR       ┌──────────────────┐
│  popup   │ ─────────────────────────▶│  pageController  │  (reads Xrm.Page)
└──────────┘  chrome.tabs.sendMessage  └────────┬─────────┘
                                                │ injects iframe with
                                                │ ?mode=record-editor
                                                │ &entity=account
                                                │ &id=<guid>
                                                │ &clientUrl=...
                                                │ &apiVersion=v9.2
                                                ▼
                                       ┌──────────────────┐
                                       │  modal iframe    │
                                       │ RecordEditorModal│ ── fetchJson ──▶ D365 Web API
                                       └────────┬─────────┘  (retrieve + metadata + PATCH)
                                                │ postMessage: SAVE_COMPLETE
                                                ▼
                                       pageController → Xrm.Page.data.refresh(false) → close iframe
```

**Key decisions:**

- Popup → active tab via a new `OPEN_RECORD_EDITOR` message handled in `pageController`'s existing `chrome.runtime.onMessage` listener. Popup sends no payload; `pageController` derives entity + id from live `Xrm.Page` state (never trusts the popup).
- Reuse the existing modal iframe SPA (`src/modal/`). `ModalApp.tsx` branches on a new `mode` URL param: `translation` (existing) or `record-editor` (new).
- All D365 Web API calls happen inside the iframe (page-context cookies via `credentials: "include"`), never from the popup or service worker.
- Auto-refresh: iframe posts `SAVE_COMPLETE` before requesting close; `pageController` calls `Xrm.Page.data.refresh(false)` then removes the iframe.
- Only `pageController` touches `Xrm.*`. Clean layering.

## Components & files

### New files

```
src/services/
  recordDataService.ts          retrieveRecord, patchRecord
  entitySetResolver.ts          logicalName → entitySetName (via EntityDefinitions)

src/hooks/
  useRecordEditor.ts            orchestrates fetch + merge + diff + save

src/modal/components/
  RecordEditorModal.tsx         Dialog wrapper, search, save/cancel, dirty badge
  FieldRow.tsx                  label + type-specific editor + revert button
  editors/
    StringEditor.tsx            Input
    MemoEditor.tsx              Textarea
    NumberEditor.tsx            Integer, Decimal, Double, Money
    BoolEditor.tsx              Switch
    DateTimeEditor.tsx          DatePicker + time input
    PicklistEditor.tsx          Combobox (also used for State/Status)
    LookupEditor.tsx            raw GUID Input + target-entity hint
    ReadOnlyField.tsx           value display for system/unsupported types
```

### Modified files

```
src/popup/…                     "Edit Record" button → chrome.tabs.sendMessage
src/controller/pageController.ts
  • New OPEN_RECORD_EDITOR handler — reads entity name + id + clientUrl from Xrm.Page
  • New iframe launcher with mode=record-editor
  • New SAVE_COMPLETE handler — Xrm.Page.data.refresh(false), close iframe
src/modal/ModalApp.tsx          Branch on mode: TranslationModal | RecordEditorModal
src/relay/relay.ts              Forward new message types
src/utils/urlBuilders.ts        buildRecordUrl(baseUrl, entitySet, id, apiVersion)
```

### Reused as-is

- `src/services/d365Api.ts#fetchJson`
- `src/services/entityMetadataService.ts#listEntityAttributes`
- Iframe scaffolding in `pageController.ts`
- Fluent `Dialog`, `MessageBar`, `Spinner`, `Input`, `Combobox`, `Switch`
- `PendingChangesProvider` (discard-changes confirmation)

## Data flow

### On modal open — parallel fetches

1. **Record retrieve:** `GET {clientUrl}/api/data/{apiVersion}/{entitySet}({id})` with header
   `Prefer: odata.include-annotations="OData.Community.Display.V1.FormattedValue,Microsoft.Dynamics.CRM.*"`.
   Response includes:
   - `field` — raw value
   - `field@OData.Community.Display.V1.FormattedValue` — display text
   - `_field_value@Microsoft.Dynamics.CRM.lookuplogicalname` — lookup target
   - `@odata.etag` — captured for later PATCH

2. **Metadata retrieve:** `listEntityAttributes(...)` — attribute list with `AttributeType`, `LogicalName`, `DisplayName`, `IsValidForUpdate`, and option-set options for Picklists.

3. **Entity set resolution (first time):** `GET /EntityDefinitions(LogicalName='{entity}')?$select=EntitySetName`. Cached for the modal lifetime.

### Merge → `FieldState[]`

```ts
{
  logicalName: string;
  displayName: string;
  type: AttributeType;
  originalValue: unknown;
  currentValue: unknown;
  formattedValue?: string;
  isReadOnly: boolean;
  lookupTarget?: string;   // logical name of target entity
  options?: { value: number; label: string }[]; // Picklist / State / Status
  isDirty: boolean;        // derived
}
```

### Read-only rule

A field is read-only if any of:
- AttributeType is unsupported: Virtual, File, Image, PartyList, CalculatedField, RollupField, MultiSelectPicklist, Customer, Owner, EntityName, Uniqueidentifier
- `IsValidForUpdate === false`
- Logical name is in the hardcoded system-field list: `createdby`, `createdon`, `createdonbehalfby`, `modifiedby`, `modifiedon`, `modifiedonbehalfby`, `versionnumber`, `overriddencreatedon`, `importsequencenumber`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `ownerid`, `owninguser`, `owningteam`, `owningbusinessunit`

`statecode` and `statuscode` are NOT in the read-only list — they are editable via standard Picklist PATCH.

### Diff and save

```
PATCH {clientUrl}/api/data/{apiVersion}/{entitySet}({id})
If-Match: {etag}
Content-Type: application/json

{
  "name": "New name",
  "statuscode": 2,
  "new_parentcontactid@odata.bind": "/contacts(<guid>)"
}
```

- Lookup PATCH uses `<navigationPropertyName>@odata.bind: "/<targetEntitySet>(<guid>)"`. Navigation property name comes from `ManyToOneRelationships` metadata, cached per modal.
- If navigation property cannot be resolved (polymorphic lookup, missing relationship), the field becomes read-only with an inline note.
- Null edit sends `null` (scalars) or `<navProp>@odata.bind: null` (lookup dissociate).

### Type-to-editor mapping

| AttributeType                                    | Editor            | PATCH value shape                               |
|-|-|-|
| String                                           | StringEditor      | string                                          |
| Memo                                             | MemoEditor        | string                                          |
| Integer / Decimal / Double / Money               | NumberEditor      | number                                          |
| Boolean                                          | BoolEditor        | boolean                                         |
| DateTime                                         | DateTimeEditor    | ISO 8601 string                                 |
| Picklist / State / Status                        | PicklistEditor    | number                                          |
| Lookup                                           | LookupEditor      | `<navProp>@odata.bind: "/<entitySet>(<guid>)"` |
| Uniqueidentifier, Virtual, File, Image,          | ReadOnlyField     | n/a                                             |
| PartyList, Calculated, Rollup, EntityName        |                   |                                                 |
| MultiSelectPicklist, Customer, Owner             | ReadOnlyField     | out of MVP                                      |

## Error handling

Errors surface in a persistent `MessageBar` at the top of the modal; field-level errors also flag the offending row.

### On open / fetch

| Failure                                               | Behavior                                                                       |
|-|-|
| No active D365 form (popup clicked on unrelated tab)  | Popup inline toast: "Open a record first" — no message sent                    |
| `Xrm.Page.data.entity.getId()` empty (unsaved record) | pageController replies: "Record not saved yet. Save before editing."          |
| Metadata or record 401/403                            | MessageBar: "Not authorized. Re-authenticate in D365."                         |
| Record fetch 404                                      | MessageBar: "Record not found (may have been deleted)."                        |
| Network / 5xx                                         | MessageBar with retry button                                                   |
| EntitySet resolve fails                               | Fall back to naive plural; if later PATCH 404s, surface error on save          |

### On save

| Failure                                          | Behavior                                                                                                       |
|-|-|
| 412 Precondition Failed (ETag mismatch)          | MessageBar + conflict UI: re-fetch, keep user edits where server unchanged; show both values where it changed, user chooses |
| 400 Bad Request                                  | Parse D365 `error.message`; show in MessageBar AND attach to likely field                                      |
| 403 Forbidden (field-level security)             | List denied fields; flag rows; do not retry automatically                                                      |
| 500/503                                          | MessageBar with retry button                                                                                   |
| Lookup nav-property unresolved                   | Field read-only before save — caught at render time                                                            |

**No partial save.** PATCH is transactional per record — either the whole request succeeds or nothing changes.

**Close guard.** If the user closes with dirty fields, a Fluent `Dialog` confirms "Discard changes?" (reuses the existing `PendingChangesProvider` pattern).

## Testing

No test framework configured. Manual smoke sequence, production build loaded as unpacked extension:

1. **Entry gating** — popup button disabled off-D365; "Open a record first" on D365 home; "Save record before editing" on unsaved form.
2. **Open & render** — account + one custom entity; fetch under 2s; every attribute present once; no console errors; search filters by display name and logical name.
3. **Happy-path save** — edit String + Picklist + DateTime + Boolean + Lookup; confirm one PATCH with exactly those fields, `@odata.bind` for lookup, `If-Match` header present; form auto-refreshes.
4. **State/status** — valid statuscode change succeeds; invalid statuscode for current statecode → D365 400 surfaces in MessageBar with D365's own text.
5. **Dirty tracking** — edit then revert disables Save and skips PATCH; per-field revert works.
6. **Concurrency** — concurrent edit in another tab → 412 + conflict UI; user keeps their edit; merges resolve cleanly.
7. **Error surfaces** — field-level security produces targeted 403 message; mid-save network failure → retry works.
8. **Close guard** — "Discard changes?" on dirty close.
9. **Regression** — original translation modal still opens and works after `ModalApp.tsx` mode branching.

**Pre-PR gates:** `npm run build`, `npx tsc --noEmit`, `npm run lint` all clean.
