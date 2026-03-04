# OptionSet Tab in Translation Modal

## Goal

Add a conditional "OptionSet Values" tab to the field translation modal. The tab appears only when the field is an optionset type (Picklist, Boolean, Status, State, MultiSelectPicklist). It displays one card per option value, each containing editable translation inputs for all provisioned languages.

## Architecture

### Detection

`TranslationModal` calls `useAttributeType(clientUrl, entity, attribute, apiVersion)` on mount. If `isOptionSetType(attributeType)` returns true, the OptionSet tab renders in the TabList.

### Data Flow

```
useOptionSetTranslations hook
  ├── calls getOptionSetMetadata() on activation (lazy, like form tab)
  ├── manages state: Record<optionValue, Record<lcid, string>>
  ├── exposes: metadata, values, originalValues, onChange, changes, loading, error
  └── save calls saveOptionSetLabels() from optionSetService
```

### Component Tree

```
TranslationModal
  ├── TabList
  │   ├── Tab "Entity Labels" (always)
  │   ├── Tab "Form Labels" (if formId+labelId)
  │   └── Tab "OptionSet Values" (if isOptionSetType)
  ├── Content area
  │   ├── ... existing entity/form content ...
  │   └── OptionSet content:
  │       └── OptionSetCard[] (one per option value)
  │           ├── Header: badge(value) + base-language label
  │           └── Rows: language name + lcid badge + Input per language
  └── Footer (save/discard, change count scoped to active tab)
```

## New Files

### `src/hooks/useOptionSetTranslations.ts`

Hook that encapsulates optionset data fetching and state management.

- **Input**: clientUrl, entity, attribute, apiVersion, langs (from useLanguages)
- **State**: metadata (OptionSetMetadata | null), values (EditableOptions), originalValues, loading, error, loaded flag
- **Exposes**: load() trigger, onChange(optionValue, lcid, value), changes array, save()
- **Pattern**: Mirrors the form tab's lazy-loading pattern (load called when tab activated)

### `src/modal/components/OptionSetCard.tsx`

Card component for a single option value's translations.

- **Props**: optionValue (number), baseLabel (string), langs (number[]), baseLcid (number), values (Record<lcid, string>), originalValues (Record<lcid, string>), disabled (boolean), onChange(lcid, value)
- **Layout**: Card with header (Badge showing numeric value + base language label) and compact rows (language name, lcid badge, input)
- **Styling**: Reuses existing card styles from translationModalStyles.ts, adds compact row styles

## Modified Files

### `src/modal/components/TranslationModal.tsx`

- Import useAttributeType, isOptionSetType, useOptionSetTranslations, OptionSetCard
- Expand TabValue: `"entity" | "form" | "optionset"`
- Add OptionSet tab (conditionally rendered, with Options icon)
- Add optionset content rendering in renderContent()
- Extend handleSave to handle optionset changes
- Extend handleDiscard for optionset tab
- Include optionset changes in totalChangeCount

### `src/modal/components/translationModalStyles.ts`

- Add styles for OptionSetCard (optionCard, optionCardHeader, optionRow, etc.)

## Save Behavior

- Save on optionset tab calls `saveOptionSetLabels()` which handles both local and global optionsets
- For local optionsets, entity is published automatically by the service
- For global optionsets, no publish needed (handled by the service)
- After save, originalValues updated to match current values (same pattern as entity/form)

## Edge Cases

- **State/Status fields**: Read-only display since these are system-managed. The `isOptionSetType` check includes them, but we should mark them as non-editable with a notice.
- **Global optionsets**: Show an informative badge ("Global: {name}") in the tab header, matching OptionSetEditorV2 behavior.
- **Boolean fields**: Only 2 options (True/False). Same card layout, just fewer cards.
- **Empty optionset**: Show empty state message.
