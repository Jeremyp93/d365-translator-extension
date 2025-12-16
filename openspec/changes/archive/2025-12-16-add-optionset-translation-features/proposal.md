# Change Proposal: Add Option Set Translation Features

**Change ID:** `add-optionset-translation-features`  
**Status:** Proposed  
**Date:** 2025-12-14  
**Proposed by:** User

## Problem Statement

The current translation tools support form and field label translations but lack support for translating option set (picklist) values. When administrators work with option sets in Dynamics 365, they need to:

1. **Identify whether a field is an option set** and distinguish between local (entity-specific) and global option sets
2. **Translate option set values** directly from the field translation page when working with that field
3. **Manage global option set translations centrally** across all entities that use them

Currently, users must navigate through the Power Platform maker portal to manage option set translations, which breaks the workflow when they're already translating field labels in the extension.

## Proposed Solution

Extend the translation capabilities with option set support through two integrated features:

### 1. Field-Level Option Set Translation (Enhancement)

When viewing a field's translation page, if the field is an option set:
- **Display option set metadata**: Show badge/indicator distinguishing "Local Option Set" vs "Global Option Set (Name)"
- **Show option set values**: List all options with their labels in a dedicated section
- **Enable translation**: Allow inline translation of option labels across all provisioned languages
- **Maintain consistency**: Use the same TranslationsTable component pattern as existing label editors

### 2. Global Option Set Management Page (New Capability)

Add a new standalone page for managing global option sets:
- **Accessible from menu**: Add navigation item in the report menu/router
- **Browse global option sets**: List all global option sets in the organization
- **Search and filter**: Find option sets by name or logical name
- **Translate options**: Edit option labels across all languages in a unified interface
- **Consistent UI**: Follow the same Fluent UI design patterns as existing pages

### 3. Additional Enhancements

- **Option set detection API**: Service methods to retrieve attribute metadata including AttributeType
- **Global option set listing**: API methods to fetch all global option sets
- **Option value service**: CRUD operations for option set label translations
- **Shared components**: Reusable UI components for option set translation tables

## Benefits

1. **Streamlined workflow**: Translate option sets without leaving the extension
2. **Clear context**: Immediate visibility into whether an option set is local or global
3. **Centralized management**: Global option sets can be managed in one place
4. **Reduced errors**: Direct editing reduces copy-paste mistakes between systems
5. **Consistent UX**: Leverages existing design patterns and components

## Affected Capabilities

### New Capabilities
- **global-optionset-translation**: Standalone page for managing global option set translations

### Modified Capabilities
- **field-translation**: Enhanced to detect and support option set fields with inline option label editing

## Implementation Scope

### Services Layer
- `src/services/optionSetService.ts` (new)
  - `getAttributeType()`: Detect if field is option set
  - `getOptionSetMetadata()`: Retrieve option set details and type
  - `getOptionSetOptions()`: Fetch option values with labels
  - `updateLocalOptionSetLabels()`: Update via parallel UpdateOptionValue calls + publish
  - `updateGlobalOptionSetLabels()`: Update via $batch endpoint with changeset
  - `listGlobalOptionSets()`: Get all global option sets

### Components
- Enhance `src/report/pages/FieldReportPage.tsx`
  - Add option set detection
  - Display option set type badge
  - Add OptionSetEditor section
- Create `src/report/pages/GlobalOptionSetPage.tsx` (new)
  - List global option sets
  - Search/filter interface
  - Option translation UI
- Create `src/components/OptionSetEditor.tsx` (new)
  - Reusable component for editing option labels
  - Similar to EntityLabelEditor/FormLabelEditor pattern

### Routing
- Update `src/report/AppRouter.tsx`
  - Add route: `/global-optionsets`

### Types
- Extend `src/types/index.ts`
  - `OptionSetMetadata`, `OptionValue`, `OptionSetType` interfaces

## Out of Scope

- Creating or deleting option sets (only translation)
- Managing option set values (add/remove options)
- State code / Status code special handling (can be added later)
- Multi-select option sets (can be added later)
- Localized descriptions (only labels in this change)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Option set batch update complexity | High | Implement batch request pattern, test thoroughly with multiple options |
| Global vs local option set confusion | Medium | Clear visual indicators (badges, icons) |
| Performance with large option sets | Medium | Implement pagination if needed, lazy load options |
| Breaking changes to field page | Low | Graceful degradation for non-option set fields |

## Dependencies

- Existing translation infrastructure (language service, TranslationsTable)
- D365 Web API AttributeMetadata endpoints
- `UpdateOptionValue` Web API action for option updates
- Parallel requests (Promise.all) for local option sets
- Batch requests with changeset for global option sets
- Fluent UI v9 components

## Success Criteria

1. Field page detects option sets and displays type (local/global)
2. Users can translate option labels directly from field page
3. Global option sets page lists all global option sets
4. Users can search and filter global option sets
5. Translations save correctly and reflect after publish
6. UI matches existing page styling and patterns
7. No regression in existing translation features

## Alternative Approaches Considered

### 1. Separate Option Set Tab on Field Page
**Pros**: Keeps all field info in one place  
**Cons**: Clutters interface for non-option set fields  
**Decision**: Rejected - conditional sections are cleaner

### 2. Modal Dialog for Option Set Translation
**Pros**: Simpler to implement  
**Cons**: Breaks from existing full-page pattern  
**Decision**: Rejected - inconsistent with current UX

### 3. Inline Option Set Editor in Form Page
**Pros**: Users could edit while viewing forms  
**Cons**: Too complex, form page already dense  
**Decision**: Deferred - could be future enhancement

## Additional Feature Suggestions

The following are recommended enhancements for future consideration:

### High Value
1. **Boolean Field Translation**: Similar to option sets, Boolean (Yes/No) fields have localizable labels
2. **Status/State Code Highlighting**: Special badges for status code and state code option sets
3. **Option Set Export/Import**: Bulk export/import option set translations similar to form labels
4. **Option Set Usage Tracking**: Show which entities/forms use a global option set

### Medium Value
5. **Multi-Select Option Sets**: Extend support to multi-select picklists
6. **Option Set Search**: Search across option labels within the field page
7. **Recently Translated**: Quick access to recently modified option sets
8. **Translation Progress**: Show % complete for each option set across languages

### Nice to Have
9. **Option Set Dependencies**: Visual indicator if option set is used in business rules
10. **Bulk Global Option Set Operations**: Apply translations to multiple option sets at once
11. **Option Set Descriptions**: Translate option descriptions (not just labels)
12. **Option Set Color Coding**: Preserve and display option colors in translation UI

## Open Questions

1. Should we support option set value reordering in the UI?
   - **Recommendation**: No, only translation in this change
2. How to handle deleted options that still have translations?
   - **Recommendation**: Display them grayed out as "Archived"
3. Should global option set page show which entities use each option set?
   - **Recommendation**: Yes, add as "Usage" column/detail
4. Do we need real-time validation for duplicate option values?
   - **Recommendation**: Rely on D365 validation on save

## Approval

- [ ] Technical review complete
- [ ] UX consistency verified
- [ ] Security/permissions reviewed
- [ ] Ready for implementation
