# Implementation Tasks

**Change ID:** `add-optionset-translation-features`

## Phase 1: Foundation & Services

### Task 1.1: Create Option Set Service
- [ ] Create `src/services/optionSetService.ts`
- [ ] Implement `getAttributeType(baseUrl, entity, attribute): Promise<string>` - returns AttributeType
- [ ] Implement `getOptionSetMetadata(baseUrl, entity, attribute): Promise<OptionSetMetadata>` - returns option set details
- [ ] Implement `getOptionSetOptions(baseUrl, entity, attribute): Promise<OptionValue[]>` - returns options with labels
- [ ] Implement `getGlobalOptionSetDetails(baseUrl, optionSetName): Promise<OptionSetMetadata>` - get global option set by name
- [ ] Implement `listGlobalOptionSets(baseUrl): Promise<GlobalOptionSetSummary[]>` - list all global option sets
- [x] Implement `updateLocalOptionSetLabels(baseUrl, entity, attribute, options): Promise<void>` - uses UpdateOptionValue action with Promise.all + publishEntityViaWebApi
- [x] Implement `updateGlobalOptionSetLabels(baseUrl, optionSetName, options): Promise<void>` - uses $batch with changeset and UpdateOptionValue actions

### Task 1.2: Type Definitions
- [ ] Add types to `src/types/index.ts`:
  - `OptionSetType` enum: "Local" | "Global"
  - `OptionSetMetadata` interface: name, logicalName, type, isGlobal, globalOptionSetName
  - `OptionValue` interface: value (number), labels (Label[]), color, isUserLocalizedLabel
  - `GlobalOptionSetSummary` interface: name, logicalName, optionCount, usageCount

### Task 1.3: Service Unit Testing
- [ ] Test option set detection for picklist fields
- [ ] Test option set detection for non-picklist fields
- [ ] Test local vs global option set distinction
- [ ] Test option value retrieval with labels
- [ ] Test global option set listing

## Phase 2: Field Page Enhancement

### Task 2.1: Option Set Detection UI
- [ ] Update `src/report/pages/FieldReportPage.tsx`:
  - [ ] Add `useEffect` to detect field type on load
  - [ ] Add state for `isOptionSet`, `optionSetMetadata`
  - [ ] Display "Loading field type..." during detection
  - [ ] Add badge/chip showing "Local Option Set" or "Global Option Set: [Name]"
  - [ ] Use Fluent UI `Badge` component with appropriate color

### Task 2.2: Option Set Editor Component
- [ ] Create `src/components/OptionSetEditor.tsx`
- [ ] Props: `clientUrl`, `entity`, `attribute`, `isGlobal`, `globalOptionSetName?`
- [ ] Load option values on mount using `getOptionSetOptions`
- [ ] Display options in table format (value, label per language)
- [ ] Use `TranslationsTable` component for consistency
- [ ] Add "Save" button with loading state
- [x] Handle save via `updateLocalOptionSetLabels` / `updateGlobalOptionSetLabels`
- [ ] Show success/error messages
- [ ] Add "Publish" step after save

### Task 2.3: Integrate into Field Page
- [ ] Add conditional section in `FieldReportPage.tsx`
- [ ] Show `OptionSetEditor` only when `isOptionSet === true`
- [ ] Position below "Form Control Labels" section
- [ ] Use `Section` component with "Option Set Values" title
- [ ] Add icon (e.g., `NumberSymbol24Regular`)
- [ ] Ensure graceful degradation for non-option set fields

## Phase 3: Global Option Set Page

### Task 3.1: Create Page Component
- [ ] Create `src/report/pages/GlobalOptionSetPage.tsx`
- [ ] Implement page layout with `PageHeader`
- [ ] Add title: "Global Option Sets"
- [ ] Add subtitle: "Manage translations for global option sets"
- [ ] Add theme toggle button
- [ ] Add icon (e.g., `NumberSymbol24Regular`)

### Task 3.2: Option Set List UI
- [ ] Load global option sets on mount using `listGlobalOptionSets`
- [ ] Display loading spinner during fetch
- [ ] Show error message if fetch fails
- [ ] Display option sets in table/card layout:
  - [ ] Name (display name)
  - [ ] Logical name
  - [ ] Option count
  - [ ] "View/Edit" action button
- [ ] Sort option sets alphabetically by name

### Task 3.3: Search & Filter
- [ ] Add search input above option set list
- [ ] Filter by name or logical name (case-insensitive)
- [ ] Update list in real-time as user types
- [ ] Show "No results" message when filtered list is empty
- [ ] Add clear search button

### Task 3.4: Option Set Detail View
- [ ] Add state for selected option set
- [ ] Display selected option set name/logical name
- [ ] Show "Back to list" button
- [ ] Load option values for selected option set
- [ ] Display options using `OptionSetEditor` component (reuse)
- [ ] Enable inline translation of option labels
- [ ] Add "Save" button
- [ ] Handle save and publish workflow

## Phase 4: Routing & Navigation

### Task 4.1: Add Route
- [ ] Update `src/report/AppRouter.tsx`
- [ ] Add route: `<Route path="/global-optionsets" element={<GlobalOptionSetPage />} />`
- [ ] Import `GlobalOptionSetPage` component

### Task 4.2: Navigation Entry
- [ ] Determine navigation pattern (currently no visible menu)
- [ ] If menu exists, add "Global Option Sets" link
- [ ] If no menu, document URL access pattern
- [ ] Consider adding breadcrumb or back navigation

## Phase 5: Polish & Testing

### Task 5.1: Error Handling
- [ ] Add error boundaries where appropriate
- [ ] Show user-friendly error messages for API failures
- [ ] Add retry mechanisms for transient errors
- [ ] Log errors to console for debugging

### Task 5.2: Loading States
- [ ] Ensure all async operations show loading indicators
- [ ] Disable buttons during save operations
- [ ] Show "Publishing..." state after save
- [ ] Prevent double-submit with disabled buttons

### Task 5.3: UI Consistency
- [ ] Verify spacing matches existing pages
- [ ] Verify colors match theme (light/dark mode)
- [ ] Verify typography matches design system
- [ ] Verify button styles match existing pages
- [ ] Test responsive layout (if applicable)

### Task 5.4: User Feedback
- [ ] Add success messages after save
- [ ] Add warning if unsaved changes exist
- [ ] Add confirmation before navigating away with unsaved changes
- [ ] Show "Last saved" timestamp
- [ ] Add tooltips for complex UI elements

### Task 5.5: Integration Testing
- [ ] Test field page with option set field
- [ ] Test field page with non-option set field
- [ ] Test local option set translation
- [ ] Test global option set translation
- [ ] Test global option set page list
- [ ] Test global option set search
- [ ] Test save and publish workflow
- [ ] Test error scenarios (API failures)
- [ ] Test with multiple languages
- [ ] Test light/dark theme switching

## Phase 6: Documentation

### Task 6.1: Code Documentation
- [ ] Add JSDoc comments to service functions
- [ ] Add inline comments for complex logic
- [x] Document UpdateOptionValue action patterns:
  - Local: Parallel Promise.all with individual POST requests
  - Global: $batch with changeset boundary for atomic operations
  - Both use MergeLabels: true to preserve existing language labels
- [ ] Add README section for option set features

### Task 6.2: User Documentation
- [ ] Update README with option set capabilities
- [ ] Add screenshots of field page with option set
- [ ] Add screenshots of global option set page
- [ ] Document workflow for translating option sets

## Implementation Order

1. **Phase 1** (Foundation) - Must complete first
2. **Phase 2** (Field Page) - Can proceed after Phase 1
3. **Phase 3** (Global Page) - Can proceed after Phase 1, parallel with Phase 2
4. **Phase 4** (Routing) - After Phase 3
5. **Phase 5** (Polish) - After all features implemented
6. **Phase 6** (Documentation) - Continuous throughout

## Estimated Effort

- Phase 1: 4-6 hours
- Phase 2: 3-4 hours
- Phase 3: 4-5 hours
- Phase 4: 0.5 hours
- Phase 5: 2-3 hours
- Phase 6: 1-2 hours

**Total: 14-20 hours**

## Notes

- Reuse existing patterns from `EntityLabelEditor` and `FormLabelEditor`
- Uses `UpdateOptionValue` Web API action (not SOAP)
- Local option sets: Parallel execution with Promise.all for performance
- Global option sets: $batch with changeset for atomicity
- Boolean fields require special handling (TrueOption/FalseOption structure)
- Type-specific metadata queries (BooleanAttributeMetadata, PicklistAttributeMetadata, etc.)
- MergeLabels: true preserves translations for languages not being updated
- Maintain consistency with Fluent UI v9 design system
- Test thoroughly with both local and global option sets
- Consider adding feature flag if gradual rollout desired
