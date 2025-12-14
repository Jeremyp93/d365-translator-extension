# Spec: Global OptionSet Translation Manager

**Capability:** global-optionset-translation (NEW)  
**Type:** New Feature  
**Status:** Draft

## Overview

A dedicated page for managing translations of global OptionSets (shared picklists) in Dynamics 365. This provides centralized translation management for OptionSets used across multiple entities and fields.

## Functional Requirements

### FR-1: List Global OptionSets
- Display all global OptionSets in the organization
- Show OptionSet name (logical name) and display name
- Show option count for each OptionSet
- Support search/filter by name
- Sort alphabetically by default

### FR-2: Select & View OptionSet
- User can select an OptionSet from the list
- Display OptionSet details in main panel:
  - Display name
  - Logical name
  - Number of options
  - List of all options with values and base labels

### FR-3: Translate Options
- Reuse TranslationsTable component from existing pages
- Support all available languages in the organization
- Allow inline editing of translations
- Show base language labels as reference
- Indicate required vs optional translations

### FR-4: Save Translations
- Validate translations before save
- Save via Dynamics 365 Web API
- Show success/error notifications
- Handle concurrent edit conflicts
- Support undo/revert changes

### FR-5: Navigation & Access
- Accessible from main menu/navigation
- Consistent with Form and Field translation pages
- Direct links from Field Translation page (for global OptionSets)

## UI Specification

### Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [Menu] Global OptionSet Translation Manager        [Refresh] │
├────────────────────────────────────────────────────────────────┤
│ [Search OptionSets..............................]  [X]         │
├───────────────────┬────────────────────────────────────────────┤
│ Global OptionSets │ Selected: Industry Code                    │
│                   │ Logical Name: industrycode                 │
│ ▸ Account Rating  │ Options: 8                                 │
│ ▸ Budget Status   │                                            │
│ ▾ Industry Code   │ ┌──────────────────────────────────────┐  │
│ ▸ Lead Priority   │ │ Translations for Industry Code       │  │
│ ▸ Lead Source     │ │                                      │  │
│ ▸ Lead Status     │ │ [TranslationsTable Component]       │  │
│ ▸ Opportunity     │ │                                      │  │
│   Rating          │ │ Value | Base | FR | ES | DE          │  │
│ ▸ Priority        │ │ ──────────────────────────────────   │  │
│ ▸ Status Reason   │ │   1   | Accounting | ... | ... | ... │  │
│                   │ │   2   | Agriculture | ... | ... | ...│  │
│ (200 total)       │ │   ... | ...                          │  │
│                   │ └──────────────────────────────────────┘  │
│                   │                                            │
│                   │ [Save Changes] [Cancel]                    │
├───────────────────┴────────────────────────────────────────────┤
│ Status: Ready                                 Last saved: 14:32│
└────────────────────────────────────────────────────────────────┘
```

### Layout Specifications

**Sidebar (Left - 30% width):**
- Fixed width on desktop, full width on mobile (collapsible)
- Scrollable list of OptionSets
- Search box at top
- Item height: 48px
- Selected item highlighted
- Hover effects

**Main Panel (Right - 70% width):**
- Header with OptionSet metadata
- TranslationsTable component (reused)
- Save/Cancel buttons at bottom
- Responsive: stack on mobile

## Component Structure

### New Components

**GlobalOptionSetPage.tsx**
```typescript
interface GlobalOptionSetPageProps {
  // No props - self-contained page
}

const GlobalOptionSetPage: React.FC = () => {
  const { optionSets, loading, error } = useGlobalOptionSets();
  const [selectedOptionSet, setSelectedOptionSet] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // ... implementation
};
```

**GlobalOptionSetList.tsx** (sub-component)
```typescript
interface GlobalOptionSetListProps {
  optionSets: GlobalOptionSetSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}
```

**GlobalOptionSetDetail.tsx** (sub-component)
```typescript
interface GlobalOptionSetDetailProps {
  optionSetName: string;
  onSave: (translations: OptionTranslations) => Promise<void>;
  onCancel: () => void;
}
```

## API Integration

### Endpoints

**List Global OptionSets:**
```http
GET /api/data/v9.2/GlobalOptionSetDefinitions
  ?$select=Name,DisplayName,Description,IsGlobal,Options
  &$filter=IsGlobal eq true
```

**Get Specific Global OptionSet:**
```http
GET /api/data/v9.2/GlobalOptionSetDefinitions(Name='{name}')
  ?$expand=Options($expand=Label)
```

**Update Global OptionSet Translations:**
```http
PUT /api/data/v9.2/GlobalOptionSetDefinitions({id})
Content-Type: application/json

{
  "Options": [
    {
      "Value": 1,
      "Label": {
        "LocalizedLabels": [
          { "Label": "Accounting", "LanguageCode": 1033 },
          { "Label": "Comptabilité", "LanguageCode": 1036 },
          { "Label": "Contabilidad", "LanguageCode": 1034 }
        ]
      }
    }
  ]
}
```

## Data Models

```typescript
interface GlobalOptionSetSummary {
  name: string; // Logical name (e.g., "industrycode")
  displayName: string; // User-facing name
  description?: string;
  optionCount: number;
  metadataId: string;
}

interface GlobalOptionSetDetails extends GlobalOptionSetSummary {
  options: OptionMetadata[];
}

interface OptionMetadata {
  value: number;
  label: LocalizedLabel;
  description?: LocalizedLabel;
  color?: string; // Some OptionSets have colors
}

interface LocalizedLabel {
  userLocalizedLabel: Label;
  localizedLabels: Label[];
}

interface Label {
  label: string;
  languageCode: number;
}
```

## User Flows

### Primary Flow: Translate Global OptionSet

1. User navigates to Global OptionSet Translation Manager from menu
2. Page loads and displays list of all global OptionSets
3. User optionally searches/filters the list
4. User clicks on an OptionSet (e.g., "Industry Code")
5. Main panel loads OptionSet details and translation table
6. User selects target languages (if not already selected)
7. User edits translations inline in the table
8. User clicks "Save Changes"
9. System validates and saves translations
10. Success notification displayed
11. Changes reflected immediately

### Alternative Flow: Navigate from Field Page

1. User is on Field Translation page
2. User selects a field that uses a global OptionSet
3. System displays OptionSet panel with "Global OptionSet" badge
4. User clicks link "Manage in Global OptionSet Translator"
5. Global OptionSet page opens with the specific OptionSet pre-selected
6. User continues with translation workflow

## Validation Rules

- **Empty Translations**: Warn but allow save
- **Duplicate Values**: Not possible (enforced by API)
- **Max Length**: OptionSet labels max 100 characters
- **Special Characters**: Allow all Unicode characters
- **Required Fields**: Base language label cannot be empty

## Error Handling

| Error Type | User Message | Recovery |
|------------|--------------|----------|
| Load failure | "Failed to load global OptionSets. Please refresh." | Retry button |
| Save failure | "Failed to save translations. Changes not saved." | Retry, details in log |
| Network error | "Network error. Check connection and try again." | Auto-retry 3x |
| Permission error | "You don't have permission to modify OptionSets." | Contact admin link |
| Concurrent edit | "OptionSet was modified by another user. Refresh?" | Reload button |

## Performance Targets

- Initial page load: <2s
- OptionSet list load: <1s for 500 OptionSets
- OptionSet detail load: <500ms
- Save operation: <2s
- Search/filter: <100ms (client-side)

## Accessibility

- Keyboard navigation (Tab, Arrow keys)
- Screen reader support (ARIA labels)
- Focus indicators
- Skip links
- High contrast mode support
- Responsive text sizing

## Mobile Responsiveness

- Sidebar collapses to dropdown on mobile
- Translation table scrolls horizontally
- Touch-friendly buttons (min 44x44px)
- Simplified layout for small screens

## Security Considerations

- Require Dynamics 365 authentication
- Check "System Customizer" or "System Administrator" role
- Validate all input server-side
- Sanitize translation values
- Rate limiting on API calls

## Caching Strategy

- Cache global OptionSet list (TTL: 5 minutes)
- Cache individual OptionSet details (TTL: 2 minutes)
- Invalidate cache on successful save
- Store in browser localStorage if possible

## Testing Requirements

### Functional Tests
- [ ] List all global OptionSets
- [ ] Search/filter OptionSets
- [ ] Select and load OptionSet details
- [ ] Edit translations inline
- [ ] Save translations successfully
- [ ] Cancel without saving
- [ ] Navigate from Field page
- [ ] Handle errors gracefully

### Performance Tests
- [ ] Load 500+ OptionSets
- [ ] Load OptionSet with 100+ options
- [ ] Rapid switching between OptionSets
- [ ] Concurrent edits by multiple users

### Accessibility Tests
- [ ] Keyboard-only navigation
- [ ] Screen reader compatibility
- [ ] Color contrast ratios
- [ ] Focus management

## Future Enhancements

- Export/import translations via Excel
- Bulk edit multiple OptionSets
- Translation suggestions from AI
- Audit log for translation changes
- Compare translations across environments
- Duplicate OptionSet for customization
- Preview changes before save

## Dependencies

- Global OptionSet Service
- useGlobalOptionSets hook
- TranslationsTable component (reused)
- d365Api extensions
- React Router for navigation
