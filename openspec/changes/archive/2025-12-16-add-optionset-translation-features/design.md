# Design Document: Option Set Translation Features

**Change ID:** `add-optionset-translation-features`  
**Date:** 2025-12-14

## Architecture Overview

This change extends the existing translation tools with option set (picklist) support through two main components:

1. **Field-level option set translation**: Enhances the existing field translation page
2. **Global option set management**: New standalone page for centralized management

Both leverage the existing service layer patterns, Web API batch request infrastructure, and Fluent UI design system.

## Technical Design

### Service Layer

#### OptionSetService API

New service: `src/services/optionSetService.ts`

```typescript
// Core detection and metadata
export async function getAttributeType(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<string>

export async function getOptionSetMetadata(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<OptionSetMetadata>

// Option value operations
export async function getOptionSetOptions(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<OptionValue[]>

export async function updateLocalOptionSetLabels(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  options: Array<{ value: number; labels: Label[] }>
): Promise<void>

// Global option set operations
export async function listGlobalOptionSets(
  baseUrl: string
): Promise<GlobalOptionSetSummary[]>

export async function getGlobalOptionSetOptions(
  baseUrl: string,
  optionSetName: string
): Promise<OptionValue[]>

export async function updateGlobalOptionSetLabels(
  baseUrl: string,
  optionSetName: string,
  options: Array<{ value: number; labels: Label[] }>
): Promise<void>
```

#### D365 API Integration

**Web API Endpoints:**
- `EntityDefinitions(LogicalName='{entity}')/Attributes(LogicalName='{attribute}')?$select=AttributeType,OptionSet`
- `EntityDefinitions(LogicalName='{entity}')/Attributes(LogicalName='{attribute}')/OptionSet?$expand=Options($expand=Label)`
- `GlobalOptionSetDefinitions?$select=Name,DisplayName&$expand=Options($expand=Label)`
- `GlobalOptionSetDefinitions(Name='{name}')?$expand=Options($expand=Label)`

**Update Operations:**

*Local Option Sets:*
- Use `UpdateOptionValue` Web API action (POST to `/api/data/v9.2/UpdateOptionValue`)
- Pattern: Parallel calls with `Promise.all` (one per option value)
- Request body includes: `EntityLogicalName`, `AttributeLogicalName`, `Value`, `Label.LocalizedLabels[]`, `MergeLabels: true`
- Publishes entity changes after all updates complete via `PublishXml`

*Global Option Sets:*
- Use `$batch` endpoint with changeset boundary for atomic operations
- POST to `/api/data/v9.2/$batch` with `multipart/mixed` content
- Each option update is a POST to `UpdateOptionValue` within changeset
- Request body includes: `OptionSetName`, `Value`, `Label.LocalizedLabels[]`, `MergeLabels: true`
- Global option sets auto-publish, no additional publish step needed

*Benefits:*
- `UpdateOptionValue` action is specifically designed for this purpose
- `MergeLabels: true` preserves labels for languages not being updated
- Batch operations for global sets ensure atomicity
- Better error handling than legacy SOAP approach

#### Data Flow

```
User Action → Component Event Handler → Service Function → D365 API → Response → State Update → UI Refresh
```

#### Implementation Example

**Local Option Set Update (Parallel):**
```typescript
const url = `${baseUrl}/api/data/v9.2/UpdateOptionValue`;

await Promise.all(
  mergedOptions.map(async (opt) => {
    const body = {
      EntityLogicalName: entityLogicalName,
      AttributeLogicalName: attributeLogicalName,
      Value: opt.value,
      Label: {
        LocalizedLabels: opt.labels.map(l => ({
          Label: l.Label,
          LanguageCode: l.LanguageCode
        }))
      },
      MergeLabels: true
    };
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'OData-Version': '4.0'
      },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) throw new Error(`UpdateOptionValue failed`);
  })
);

await publishEntityViaWebApi(baseUrl, entityLogicalName);
```

**Global Option Set Update (Batch):**
```typescript
const batchBoundary = `batch_${crypto.randomUUID()}`;
const changesetBoundary = `changeset_${crypto.randomUUID()}`;

const lines = [];
lines.push(`--${batchBoundary}`);
lines.push(`Content-Type: multipart/mixed;boundary=${changesetBoundary}`);
lines.push("");

for (const opt of mergedOptions) {
  const body = {
    OptionSetName: optionSetName,
    Value: opt.value,
    Label: { LocalizedLabels: opt.labels },
    MergeLabels: true
  };
  
  lines.push(`--${changesetBoundary}`);
  lines.push("Content-Type: application/http");
  lines.push("Content-Transfer-Encoding: binary");
  lines.push(`Content-ID: ${contentId++}`);
  lines.push("");
  lines.push("POST /api/data/v9.2/UpdateOptionValue HTTP/1.1");
  lines.push("Content-Type: application/json");
  lines.push("");
  lines.push(JSON.stringify(body));
}

lines.push(`--${changesetBoundary}--`);
lines.push(`--${batchBoundary}--`);

await fetch(`${baseUrl}/api/data/v9.2/$batch`, {
  method: 'POST',
  headers: { 'Content-Type': `multipart/mixed;boundary=${batchBoundary}` },
  body: lines.join("\r\n")
});
// Global option sets auto-publish
```

### Component Architecture

#### Enhanced FieldReportPage

```tsx
// Additional state
const [attributeType, setAttributeType] = useState<string | null>(null);
const [optionSetMetadata, setOptionSetMetadata] = useState<OptionSetMetadata | null>(null);
const [isLoadingType, setIsLoadingType] = useState(false);

// Detection on mount
useEffect(() => {
  detectAttributeType();
}, [clientUrl, entity, attribute]);

// Conditional rendering
{attributeType === 'Picklist' && (
  <Section title="Option Set Values" icon={<NumberSymbol24Regular />}>
    {optionSetMetadata?.isGlobal && (
      <Badge color="brand">
        Global: {optionSetMetadata.globalOptionSetName}
      </Badge>
    )}
    {!optionSetMetadata?.isGlobal && (
      <Badge color="informative">Local Option Set</Badge>
    )}
    <OptionSetEditor
      clientUrl={clientUrl}
      entity={entity}
      attribute={attribute}
      isGlobal={optionSetMetadata?.isGlobal}
      globalOptionSetName={optionSetMetadata?.globalOptionSetName}
    />
  </Section>
)}
```

#### New OptionSetEditor Component

```tsx
interface OptionSetEditorProps {
  clientUrl: string;
  entity: string;
  attribute: string;
  isGlobal: boolean;
  globalOptionSetName?: string;
}

export function OptionSetEditor(props: OptionSetEditorProps) {
  const [options, setOptions] = useState<OptionValue[]>([]);
  const [values, setValues] = useState<Record<number, Record<number, string>>>({});
  const [saving, setSaving] = useState(false);
  
  // Load options on mount
  // Render table with TranslationsTable pattern
  // Handle save with publish
}
```

Structure similar to EntityLabelEditor:
- Load data on mount
- Provide editable table
- Save button with loading state
- Error/success feedback
- Publish after save

#### New GlobalOptionSetPage Component

```tsx
export default function GlobalOptionSetPage() {
  const [optionSets, setOptionSets] = useState<GlobalOptionSetSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptionSet, setSelectedOptionSet] = useState<string | null>(null);
  
  // List view when selectedOptionSet is null
  // Detail view when selectedOptionSet is set
  // Back button to return to list
}
```

Layout:
- Header with theme toggle
- Search bar
- List/grid of option sets
- Detail view with OptionSetEditor (reused)

### Type Definitions

```typescript
export enum OptionSetType {
  Local = 'Local',
  Global = 'Global'
}

export interface OptionSetMetadata {
  logicalName: string;
  displayName: string;
  attributeType: string;
  isGlobal: boolean;
  globalOptionSetName?: string;
  metadataId: string;
}

export interface OptionValue {
  value: number;
  labels: Label[];
  color?: string;
  description?: string;
  isUserLocalizedLabel: boolean;
}

export interface GlobalOptionSetSummary {
  name: string;
  logicalName: string;
  displayName: Label[];
  optionCount: number;
  metadataId: string;
}
```

### UI/UX Design

#### Field Page - Option Set Badge

```
┌─────────────────────────────────────────┐
│ Field Translations                  [🌙]│
├─────────────────────────────────────────┤
│ Context                                 │
│   Entity: contact                       │
│   Attribute: preferredcontactmethodcode │
├─────────────────────────────────────────┤
│ Entity Field Labels                     │
│   [Translation Table]                   │
├─────────────────────────────────────────┤
│ Option Set Values                       │
│   [Global: ContactMethodCode] (badge)   │
│                                         │
│   Value    English       French         │
│   ─────────────────────────────────────│
│   1        Email         Courriel       │
│   2        Phone         Téléphone      │
│   3        Fax           Télécopie      │
│                                         │
│   [Save & Publish]                      │
└─────────────────────────────────────────┘
```

#### Global Option Set Page

```
┌─────────────────────────────────────────┐
│ Global Option Sets              [🌙]    │
│ Manage translations for global...       │
├─────────────────────────────────────────┤
│ [🔍 Search option sets...]              │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Account Type                  [Edit]│ │
│ │ accounttype • 5 options             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Contact Method                [Edit]│ │
│ │ contactmethod • 3 options           │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Industry                      [Edit]│ │
│ │ industrycode • 8 options            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Error Handling

1. **API Failures**: Show user-friendly error messages, allow retry
2. **Missing Permissions**: Detect and show permission error with guidance
3. **Network Issues**: Retry with exponential backoff
4. **Invalid Data**: Validate before sending to API
5. **Concurrent Edits**: Use ETags where applicable (existing pattern)

### Performance Considerations

1. **Lazy Loading**: Load option values only when section is viewed
2. **Caching**: Cache option set metadata during session
3. **Debouncing**: Debounce search input on global option set page
4. **Pagination**: If option set has >100 options, implement pagination
5. **Parallel Requests**: Fetch option values and languages in parallel

### Security Considerations

1. **Permission Checks**: Rely on D365 API permission enforcement
2. **Input Validation**: Validate option values and labels before batch operations
3. **XSS Prevention**: React's built-in escaping handles user input
4. **CORS**: Existing credentials: 'include' pattern handles auth

### Testing Strategy

#### Unit Tests (if added later)
- Service functions with mocked fetch
- Option set detection logic
- Label merge logic
- Type guards

#### Integration Tests
- Test with real D365 environment
- Verify local option set translation
- Verify global option set translation
- Verify badge display (local vs global)
- Verify search/filter on global page
- Verify publish workflow

#### Manual Test Cases
1. Load field page with local option set
2. Load field page with global option set
3. Load field page with non-option set field
4. Translate local option set labels
5. Translate global option set labels from field page
6. Open global option sets page
7. Search for option set
8. Edit global option set from dedicated page
9. Verify translations appear after publish
10. Test error scenarios (network failure, permission denied)

## Implementation Phases

### Phase 1: Services (Critical Path)
Build the foundation - service functions, types, API integration

### Phase 2: Field Page Enhancement
Extend existing page with option set support

### Phase 3: Global Option Set Page
New standalone page (can be developed in parallel with Phase 2)

### Phase 4: Integration & Testing
Connect all pieces, test thoroughly, polish UI

## Rollout Plan

1. **Development**: Implement all phases
2. **Internal Testing**: Test with development D365 org
3. **Beta Testing**: Enable for select users (feature flag)
4. **Full Rollout**: Enable for all users after validation

## Maintenance Considerations

- Follow existing patterns for consistency
- Document batch request patterns and error handling
- Monitor for D365 API changes
- Keep dependencies updated (Fluent UI)
- Consider telemetry for usage tracking

## Future Enhancements

Once core functionality is stable:
1. Boolean field translations (similar pattern)
2. Multi-select option sets
3. Bulk export/import for option sets
4. Option set usage tracking
5. Status/state code special handling
