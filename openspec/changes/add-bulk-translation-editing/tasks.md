# Implementation Tasks: Bulk Translation Editing

## 1. Data Structures & Types
- [ ] 1.1 Define `PendingChange` interface (entity, attribute, languageCode, oldValue, newValue)
- [ ] 1.2 Define `PendingChangesMap` structure (efficient lookup and grouping)
- [ ] 1.3 Define `BatchUpdateResult` interface (success count, failures, error details)
- [ ] 1.4 Add type exports to `src/types/index.ts`

## 2. Pending Changes State Management
- [ ] 2.1 Create React context `PendingChangesContext` with provider
- [ ] 2.2 Implement `usePendingChanges` hook with add/remove/clear operations
- [ ] 2.3 Add change count calculation
- [ ] 2.4 Implement grouping helpers (by entity, by attribute)
- [ ] 2.5 Add dirty state tracking for navigation guards

## 3. Entity Label Editor Changes (Backward Compatible)
- [ ] 3.1 Add optional `bulkMode?: boolean` prop to `EntityLabelEditor.tsx`
- [ ] 3.2 Add optional `onAddToCart?: (changes) => void` prop
- [ ] 3.3 Conditionally render "Save & Publish" (default) vs "Add to Cart" (bulk mode)
- [ ] 3.4 Track original values for comparison in bulk mode
- [ ] 3.5 Integrate with `usePendingChanges` hook only when in bulk mode
- [ ] 3.6 Verify FieldReportPage still works with immediate save (no changes needed)
- [ ] 3.7 Add visual feedback when changes are added to cart

## 4. Web API Update Method (Migrate from SOAP)
- [ ] 4.1 Create `updateAttributeLabelsViaWebApi()` in `entityLabelService.ts`
- [ ] 4.2 Build HTTP PUT request to `EntityDefinitions(...)/Attributes(...)`
- [ ] 4.3 Set `MSCRM.MergeLabels: true` header
- [ ] 4.4 Format DisplayName.LocalizedLabels with proper OData types
- [ ] 4.5 Test single attribute update via Web API
- [ ] 4.6 Keep SOAP method as fallback for compatibility

## 5. Batch Save Service
- [ ] 5.1 Implement `batchUpdateAttributeLabels()` in `entityLabelService.ts`
- [ ] 5.2 Build $batch request with Web API PUT operations
- [ ] 5.3 Handle D365 $batch response parsing
- [ ] 5.4 Extract success/failure results per attribute
- [ ] 5.5 Add fallback to Promise.all if $batch fails
- [ ] 5.6 Add error handling and retry logic

## 6. Multi-Entity Publish
- [ ] 6.1 Create `publishMultipleEntities()` in `d365Api.ts`
- [ ] 6.2 Build ParameterXml with multiple `<entity>` tags
- [ ] 6.3 Call PublishXml once with all affected entities
- [ ] 6.4 Add error handling for publish failures
- [ ] 6.5 Test with 1, 3, and 10+ entities

## 7. Pending Changes Cart Modal
- [ ] 7.1 Create `PendingChangesCartModal.tsx` component
- [ ] 7.2 Implement grouped view (entity → attribute → language changes)
- [ ] 7.3 Add old value vs new value comparison display
- [ ] 7.4 Add "Remove" button for individual changes
- [ ] 7.5 Add "Clear All" button with confirmation
- [ ] 7.6 Add "Save All" button with loading state
- [ ] 7.7 Implement save results summary display
- [ ] 7.8 Add retry UI for failed items

## 8. Entity Attribute Browser Page Integration
- [ ] 8.1 Wrap page with `PendingChangesProvider`
- [ ] 8.2 Add cart button to page header with badge count
- [ ] 8.3 Implement modal open/close handlers
- [ ] 8.4 Add beforeunload event handler to warn about unsaved changes
- [ ] 8.5 Add prompt when navigating away with React Router
- [ ] 8.6 Test entity switching with pending changes
- [ ] 8.7 Pass `bulkMode={true}` to EntityLabelEditor

## 9. Error Handling & Edge Cases
- [ ] 9.1 Handle empty cart state (disable save)
- [ ] 9.2 Handle all failures in batch (show error, keep changes)
- [ ] 9.3 Handle partial failures (remove successful, keep failed)
- [ ] 9.4 Handle network errors (show retry option)
- [ ] 9.5 Handle concurrent edits to same attribute
- [ ] 9.6 Validate all labels before batch save

## 10. UI/UX Polish
- [ ] 10.1 Add loading spinners during batch save
- [ ] 10.2 Add success toast notification
- [ ] 10.3 Add error notifications with details
- [ ] 10.4 Add empty state for cart modal
- [ ] 10.5 Ensure cart button is accessible (keyboard, screen reader)
- [ ] 10.6 Add confirmation dialog for "Clear All"
- [ ] 10.7 Improve cart badge styling (Fluent UI CounterBadge)

## 11. Testing & Validation
- [ ] 11.1 Test with single attribute change
- [ ] 11.2 Test with multiple attributes on same entity
- [ ] 11.3 Test with attributes across different entities
- [ ] 11.4 Test with 50+ pending changes (performance)
- [ ] 11.5 Test partial failure scenario
- [ ] 11.6 Test complete failure scenario
- [ ] 11.7 Test unsaved changes warning on page close
- [ ] 11.8 Test entity switching preserves changes
- [ ] 11.9 Verify Web API PUT request format
- [ ] 11.10 Verify $batch request format
- [ ] 11.11 Verify publish happens for all affected entities
- [ ] 11.12 Test FieldReportPage still works (no regression)

## 12. Documentation
- [ ] 12.1 Update component JSDoc comments
- [ ] 12.2 Add inline code comments for batch API logic
- [ ] 12.3 Document pending changes data structure
- [ ] 12.4 Add README section about bulk editing workflow
- [ ] 12.5 Document Web API migration from SOAP
