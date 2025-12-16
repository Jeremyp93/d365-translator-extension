# Spec Delta: Field Translation - OptionSet Support

**Capability:** field-translation  
**Type:** Enhancement  
**Status:** Draft

## Changes to Existing Capability

This spec delta extends the field-translation capability to support OptionSet (picklist) fields.

## Current Behavior

The Field Translation page currently:
- Displays entity fields from selected forms
- Shows field display names and labels
- Allows translation of field labels across multiple languages
- Does not handle OptionSet option translations

## New Behavior

When a field is an OptionSet (Picklist, MultiSelect Picklist, Status, State, Boolean):

1. **Detection**: System automatically detects OptionSet field types
2. **OptionSet Panel**: Display expandable panel below field label translations
3. **Type Indicator**: Show badge indicating "Local OptionSet" or "Global OptionSet"
4. **Options Display**: List all OptionSet options with:
   - Option value (integer)
   - Base language label
   - Translation columns for each selected language
5. **Global Link**: For global OptionSets, show link to Global OptionSet Manager
6. **Inline Editing**: Allow direct translation of option labels
7. **Validation**: Warn if translations are empty before saving

## UI Specification

### OptionSet Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Field: priority                                              │
│ Display Name: Priority                                       │
│ Translations: [existing translation table]                   │
├─────────────────────────────────────────────────────────────┤
│ ▼ OptionSet Options [Local OptionSet]                        │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ Value │ Base Label    │ French (1036) │ Spanish (1034)   ││
│ ├───────────────────────────────────────────────────────────┤│
│ │  1    │ Low           │ [Faible     ] │ [Baja          ] ││
│ │  2    │ Medium        │ [Moyenne    ] │ [Media         ] ││
│ │  3    │ High          │ [Haute      ] │ [Alta          ] ││
│ │  4    │ Critical      │ [Critique   ] │ [Crítica       ] ││
│ └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Global OptionSet Variant

```
┌─────────────────────────────────────────────────────────────┐
│ ▼ OptionSet Options [Global OptionSet: "industrycode"]       │
│   → Manage in Global OptionSet Translator                    │
│                                                               │
│ [Same options table as above]                                 │
└─────────────────────────────────────────────────────────────┘
```

## Component Changes

### FieldReportPage.tsx

**Add:**
- Detection logic for OptionSet fields
- Conditional rendering of OptionSetTranslationPanel
- Pass entity/attribute metadata to panel

```typescript
{selectedField && isOptionSetField(selectedField) && (
  <OptionSetTranslationPanel
    entityLogicalName={entityLogicalName}
    attributeLogicalName={selectedField.logicalName}
    selectedLanguages={selectedLanguages}
    onSave={handleOptionSetSave}
  />
)}
```

## API Requirements

**New Endpoints Used:**
- `GET /api/data/v9.2/EntityDefinitions(LogicalName='{entity}')/Attributes(LogicalName='{attribute}')`
  - Retrieve field metadata including OptionSet definition
  - Response includes `OptionSet` property with options and metadata

**Data Structure:**
```typescript
interface OptionSetMetadata {
  isGlobal: boolean;
  name: string; // For global: "industrycode", for local: null
  options: Array<{
    value: number;
    label: LocalizedLabel;
    description?: LocalizedLabel;
  }>;
}
```

## User Experience Flow

1. User selects a form on Field Translation page
2. User selects a field from the field list
3. **[NEW]** If field is OptionSet:
   - System fetches OptionSet metadata
   - OptionSet panel renders below field labels
   - Badge shows "Local" or "Global" type
   - Options table displays with translation inputs
4. User edits option translations inline
5. User clicks Save (shared save button with field labels)
6. System validates translations (warns if empty)
7. System saves translations via API
8. Success notification displayed

## Edge Cases & Validation

- **No Options**: Show "No options defined" message
- **Read-Only OptionSet**: Disable editing, show info notice
- **Large OptionSets**: Use virtualization for 50+ options
- **Missing Base Label**: Show option value only
- **Empty Translations**: Warn before save, allow save anyway
- **Global OptionSet**: Link to Global OptionSet Manager instead of inline edit (optional)

## Accessibility

- Keyboard navigation through option rows
- Screen reader announcements for OptionSet type
- Focus management when expanding/collapsing panel
- ARIA labels for translation inputs

## Performance Targets

- Load OptionSet metadata: <500ms
- Render 100 options: <200ms
- Save translations: <1s per OptionSet
- No UI blocking during save

## Testing Checklist

- [ ] Picklist field displays options correctly
- [ ] MultiSelect Picklist field displays options
- [ ] Status field displays status options
- [ ] State field displays state options
- [ ] Boolean field displays Yes/No options
- [ ] Local OptionSet shows correct badge
- [ ] Global OptionSet shows correct badge and link
- [ ] Translations save correctly
- [ ] Empty translations show warning
- [ ] Large OptionSets (100+ options) perform well
- [ ] Error handling works for API failures

## Dependencies

- OptionSet Service (new)
- useOptionSetOptions hook (new)
- OptionSetTranslationPanel component (new)
- GlobalOptionSetBadge component (new)

## Backward Compatibility

✅ Fully backward compatible. Existing field translation functionality unchanged. OptionSet support is additive only.
