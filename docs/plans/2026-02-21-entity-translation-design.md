# Entity-Level Translation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow translating entity-level labels (DisplayName, Description, DisplayCollectionName) from the Entity Browser page with immediate save & publish.

**Architecture:** Add service functions to read/write entity labels via the D365 EntityDefinitions endpoint. A new hook fetches all 3 label types. A new tabbed component (`EntityTranslationEditor`) renders a `TabList` with one tab per label type, each showing a `TranslationsTable` with a Save & Publish button. Immediate save mode (no cart).

**Tech Stack:** React 18, TypeScript, Fluent UI v9, D365 Web API (OData)

---

## Task 1: Add entity-level label service functions

**Files:**
- Modify: `src/services/entityLabelService.ts` (add new functions at the end)

**Step 1: Add `getEntityLabelTranslations()`**

Add this function to `src/services/entityLabelService.ts`:

```typescript
import { buildEntityDefinitionUrl } from '../utils/urlBuilders';

export type EntityLabelField = 'DisplayName' | 'Description' | 'DisplayCollectionName';

export interface EntityLabelsResult {
  displayName: Label[];
  description: Label[];
  collectionName: Label[];
  metadataId: string;
}

/** Fetch all 3 translatable label sets for an entity */
export async function getEntityLabelTranslations(
  baseUrl: string,
  entityLogicalName: string
): Promise<EntityLabelsResult> {
  const url = buildEntityDefinitionUrl({
    baseUrl,
    apiVersion: 'v9.2',
    entityLogicalName,
    select: ['DisplayName', 'Description', 'DisplayCollectionName', 'MetadataId'],
  });
  const j = await fetchJson(url);

  const mapLabels = (field: any): Label[] => {
    const arr = toArray(field?.LocalizedLabels);
    return arr.map((l: any) => ({
      languageCode: Number(l.LanguageCode),
      label: String(l.Label ?? ''),
    }));
  };

  return {
    displayName: mapLabels(j?.DisplayName),
    description: mapLabels(j?.Description),
    collectionName: mapLabels(j?.DisplayCollectionName),
    metadataId: String(j?.MetadataId ?? ''),
  };
}
```

Note: `fetchJson`, `toArray`, and `buildEntityDefinitionUrl` are already imported or available. Add `buildEntityDefinitionUrl` to the existing import from `../utils/urlBuilders`.

**Step 2: Add `updateEntityLabelsViaWebApi()`**

Add this function to `src/services/entityLabelService.ts`:

```typescript
/**
 * Update entity-level labels using Web API PUT.
 * Only sends the specified label field(s).
 */
export async function updateEntityLabelsViaWebApi(
  baseUrl: string,
  entityLogicalName: string,
  metadataId: string,
  field: EntityLabelField,
  labels: { LanguageCode: number; Label: string }[]
): Promise<void> {
  const localizedLabels = labels.map((l) => ({
    '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel',
    Label: l.Label,
    LanguageCode: l.LanguageCode,
  }));

  const requestBody: Record<string, unknown> = {
    '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
    MetadataId: metadataId,
    [field]: {
      '@odata.type': 'Microsoft.Dynamics.CRM.Label',
      LocalizedLabels: localizedLabels,
    },
  };

  const url = buildEntityDefinitionUrl({
    baseUrl,
    apiVersion: 'v9.2',
    entityLogicalName,
  });

  await fetchJson(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'MSCRM.MergeLabels': 'true',
    },
    body: JSON.stringify(requestBody),
  });
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 4: Commit**

```bash
git add src/services/entityLabelService.ts
git commit -m "feat: add entity-level label read/write service functions"
```

---

## Task 2: Create `useEntityLabels` hook

**Files:**
- Create: `src/hooks/useEntityLabels.ts`

**Step 1: Create the hook**

Create `src/hooks/useEntityLabels.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import {
  getEntityLabelTranslations,
  type EntityLabelsResult,
} from '../services/entityLabelService';
import { getErrorMessage } from '../utils/errorHandling';

interface UseEntityLabelsResult {
  labels: EntityLabelsResult | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch all 3 translatable label sets (DisplayName, Description, DisplayCollectionName)
 * for the selected entity.
 */
export function useEntityLabels(
  clientUrl: string,
  entityLogicalName: string | null
): UseEntityLabelsResult {
  const [labels, setLabels] = useState<EntityLabelsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reload = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!clientUrl || !entityLogicalName) {
      setLabels(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);
        const result = await getEntityLabelTranslations(clientUrl, entityLogicalName);
        if (!cancelled) setLabels(result);
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [clientUrl, entityLogicalName, reloadTrigger]);

  return { labels, loading, error, reload };
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/hooks/useEntityLabels.ts
git commit -m "feat: add useEntityLabels hook for entity-level translations"
```

---

## Task 3: Create `EntityTranslationEditor` component

**Files:**
- Create: `src/components/EntityTranslationEditor.tsx`

**Step 1: Create the component**

Create `src/components/EntityTranslationEditor.tsx`. This component:
- Receives `labels: EntityLabelsResult`, `clientUrl`, `entityLogicalName`, `readOnly`
- Renders a Fluent UI `TabList` with 3 `Tab` items: Display Name, Description, Collection Name
- Each tab renders a `TranslationsTable` (reused from existing codebase)
- Has a Save & Publish button that calls `updateEntityLabelsViaWebApi()` then `publishEntityViaWebApi()`
- Manages local editable state per tab independently
- Uses `useLanguages` hook for LCID list

Key implementation details:
- Store edited values as `Record<EntityLabelField, Record<number, string>>` (one map per tab)
- Store original values separately to detect changes
- On tab switch, keep all state (don't reset edits)
- On save, only send changed languages for the active tab
- After save + publish, update original values to match saved state
- Show saving/info/error feedback inline

Imports needed:
- `useState`, `useMemo`, `useEffect` from `react`
- `TabList`, `Tab`, `Card`, `CardHeader`, `Text`, `Divider`, `makeStyles`, `tokens` from `@fluentui/react-components`
- `TranslationsTable` from `./TranslationsTable`
- `Button` from `./ui/Button`
- `ErrorBox`, `Info` from `./ui/Notice`
- `useLanguages` from `../hooks/useLanguages`
- `updateEntityLabelsViaWebApi`, `EntityLabelField` from `../services/entityLabelService`
- `publishEntityViaWebApi` from `../services/d365Api`
- `spacing` from `../styles/theme`

Props interface:
```typescript
interface EntityTranslationEditorProps {
  clientUrl: string;
  entityLogicalName: string;
  labels: EntityLabelsResult;
  readOnly?: boolean;
  onSaved?: () => void; // callback after successful save to reload entity list
}
```

The `TabList` should use `appearance="subtle"` and `size="small"` to keep it compact within the Section.

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/EntityTranslationEditor.tsx
git commit -m "feat: add EntityTranslationEditor component with tabbed UI"
```

---

## Task 4: Integrate into EntityAttributeBrowserPage

**Files:**
- Modify: `src/report/pages/EntityAttributeBrowserPage.tsx`

**Step 1: Add imports and hook**

Add these imports:
```typescript
import { useEntityLabels } from '../../hooks/useEntityLabels';
import EntityTranslationEditor from '../../components/EntityTranslationEditor';
```

Inside `EntityAttributeBrowserPageContent`, add the hook call after the existing hooks:
```typescript
const { labels: entityLabels, loading: entityLabelsLoading, error: entityLabelsError, reload: reloadEntityLabels } = useEntityLabels(clientUrl, selectedEntity);
```

**Step 2: Add the Section to the JSX**

In the center `detailPanel` section, between the entity-selected check and `<AttributeDataGrid>`, add:

```tsx
{/* Entity Translation Editor */}
{selectedEntity && !attributesLoading && entityLabels && (
  <Section title="Entity Translation">
    <EntityTranslationEditor
      clientUrl={clientUrl}
      entityLogicalName={selectedEntity}
      labels={entityLabels}
      readOnly={isSaving || isEditingBlocked}
      onSaved={reloadEntityLabels}
    />
  </Section>
)}
```

Also add `entityLabelsError` to the error display area:
```tsx
{entityLabelsError && <ErrorBox>{entityLabelsError}</ErrorBox>}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Manual test**

1. Load the extension in Chrome
2. Open the Entity Browser page
3. Select an entity (e.g., "account")
4. Verify "Entity Translation" section appears above the attributes grid
5. Verify 3 tabs: Display Name, Description, Collection Name
6. Switch between tabs — each should show language rows
7. Edit a label, click Save & Publish
8. Verify the save completes and label is updated in D365

**Step 5: Commit**

```bash
git add src/report/pages/EntityAttributeBrowserPage.tsx
git commit -m "feat: integrate entity translation editor into Entity Browser page"
```

---

## Task 5: Polish and edge cases

**Files:**
- Modify: `src/components/EntityTranslationEditor.tsx`

**Step 1: Handle empty base language**

Ensure the base language label cannot be saved as empty (same guard as attribute saves). If the user clears the base language label, use the entity logical name as fallback before sending to API.

**Step 2: Handle loading state for entity labels**

Show a spinner in the Entity Translation section while `entityLabelsLoading` is true, rather than hiding the section entirely. This prevents layout shift.

**Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: Both pass.

**Step 4: Commit**

```bash
git add src/components/EntityTranslationEditor.tsx src/report/pages/EntityAttributeBrowserPage.tsx
git commit -m "fix: handle empty base language and loading state in entity translation"
```
