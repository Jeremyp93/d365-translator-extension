# Change Proposal: Bulk Translation Editing for Entity Attributes

**Change ID:** `add-bulk-translation-editing`
**Status:** Proposed
**Date:** 2025-12-20
**Proposed by:** User

## Why

The current Entity Attribute Browser allows users to translate one attribute at a time. Each attribute selection loads its translations, and clicking "Save & Publish" immediately commits that single attribute's changes. For administrators working with multiple entities and attributes, this workflow is inefficient:

- Users must wait for each save/publish cycle before moving to the next attribute
- Context switching between attributes is disruptive
- No way to review all pending changes before committing
- Difficult to maintain consistency across related attributes

Users need a shopping-cart-style workflow where they can:
1. Edit multiple attributes across multiple entities
2. Accumulate changes locally
3. Review all changes together (old value vs new value)
4. Save everything in a single batch operation

## What Changes

- **Local change tracking**: Store translation edits in-memory without immediate API calls
- **Pending changes cart**: Button with badge showing count of pending changes
- **Review modal**: Shopping-cart-style modal showing all changes (entity > attribute > language > old vs new)
- **Batch save**: Single API batch request to update all attributes + publish affected entities
- **Unsaved changes protection**: Warn users before navigating away with pending changes
- **Partial failure handling**: Show summary of successful/failed updates with retry option for failed items
- **Entity switching**: Allow switching between entities without losing pending changes

## Impact

### Affected Capabilities
- **entity-attribute-translation** (NEW): Introduce this capability spec to document the bulk translation workflow

### Affected Code
- `src/report/pages/EntityAttributeBrowserPage.tsx` - Add pending changes state, cart button, modal
- `src/components/EntityLabelEditor.tsx` - Change to accumulate locally instead of immediate save
- `src/services/entityLabelService.ts` - Add batch update method
- New component: `src/components/PendingChangesCartModal.tsx` - Review and save modal
- New type definitions for pending changes data structure

### Breaking Changes
None - this is an additive enhancement to existing workflow.

## User Experience

### Current Flow
1. Select entity → Select attribute
2. Edit translations
3. Click "Save & Publish" → Wait for save
4. Select next attribute → Repeat

### New Flow
1. Select entity → Select attribute
2. Edit translations → Changes stored locally
3. Select another attribute or entity → Edit more translations
4. Click "Review Changes" cart button → See all pending changes
5. Review modal shows old vs new values grouped by entity/attribute
6. Click "Save All" → Batch update + publish
7. See summary: "15 attributes updated successfully, 2 failed" with retry option

## Alternative Approaches Considered

### 1. Auto-save after each edit
**Pros**: Simple, no pending state
**Cons**: Still one-at-a-time saves, no batch efficiency
**Decision**: Rejected - doesn't solve the core batching problem

### 2. Sticky bottom panel for recap instead of modal
**Pros**: Always visible
**Cons**: Takes up screen space, less clean for large change sets
**Decision**: Rejected - user prefers modal/cart UX

### 3. Undo/redo stack
**Pros**: Granular control
**Cons**: Complex state management, not necessary for this use case
**Decision**: Deferred - could be future enhancement
