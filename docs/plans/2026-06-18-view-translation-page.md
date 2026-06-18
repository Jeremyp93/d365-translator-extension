# View Translation Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a report page that translates the `name` and `description` of D365 system views (`savedquery`), entity-first, with full launcher wiring — mirroring the existing Global OptionSet page.

**Architecture:** A new `savedQueryService` (framework-agnostic Web API calls) → two hooks (`useSystemViews`, `useViewTranslations`) → a `ViewLabelEditor` component (reusing `TranslationsTable`) → a `ViewTranslationPage` registered in `AppRouter`. Reading existing translations uses the `RetrieveLocLabels` function; saving uses the `SetLocLabels` action (batched), followed by a `PublishXml` of the view's entity. The launcher button reuses the existing `pageController → relay → background` message chain.

**Tech Stack:** React 18, TypeScript (strict), Fluent UI, Vite, Chrome MV3, D365 Web API v9.2.

> **No test framework is configured in this repo** (per CLAUDE.md — manual testing only). "TDD" here means: each task ends with a **verification gate** (`npx tsc --noEmit` + `npm run lint`, and `npm run build` where relevant), and a **manual D365 check** at the end. Do not fabricate a test harness.
>
> **Branch:** Work continues on `feature/enhancements` (current branch). Commit after every task.
>
> **Reference templates to read before starting:** `src/services/optionSetService.ts`, `src/report/pages/GlobalOptionSetPage.tsx`, `src/hooks/useOptionSetTranslations.ts`, `src/components/TranslationsTable.tsx`, `src/components/ListSelector.tsx`.

---

## API reference (verified against Microsoft Learn)

**SetLocLabels** (Action, POST `/api/data/v9.2/SetLocLabels`):
```json
{
  "EntityMoniker": { "@odata.type": "Microsoft.Dynamics.CRM.savedquery", "savedqueryid": "<guid>" },
  "AttributeName": "name",
  "Labels": [
    { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Comptes actifs", "LanguageCode": 1036, "IsManaged": false }
  ]
}
```
Returns `204 No Content`.

**RetrieveLocLabels** (Function, GET):
```text
/api/data/v9.2/RetrieveLocLabels(EntityMoniker=@p1,AttributeName=@p2,IncludeUnpublished=@p3)?@p1={"@odata.id":"savedqueries(<guid>)"}&@p2='name'&@p3=true
```
Response shape to confirm at runtime (Task 3, Step 3): expected `{ "Label": { "LocalizedLabels": [ { "Label": "...", "LanguageCode": 1036 } ] } }`. Parse defensively via `toArray(j?.Label?.LocalizedLabels)`.

---

## Task 1: Domain types + querytype helper

**Files:**
- Create: `src/services/savedQueryService.ts` (types + helper only in this task)

**Step 1: Add the summary type and querytype label helper**

Create `src/services/savedQueryService.ts` with just:

```ts
import { fetchJson, toArray } from './d365Api';
import { buildApiUrl } from '../utils/urlBuilders';

export interface SavedQuerySummary {
  savedQueryId: string;
  name: string;
  description: string;
  queryType: number;
  isDefault: boolean;
  isCustomizable: boolean;
}

/** querytype 0 is the public/main grid view shown in the view selector. */
export const PUBLIC_VIEW_QUERY_TYPE = 0;

const QUERY_TYPE_LABELS: Record<number, string> = {
  0: 'Public',
  1: 'Advanced Find',
  2: 'Associated',
  4: 'Quick Find',
  8: 'Reporting',
  16: 'Offline Filter',
  32: 'Lookup',
  64: 'SM Appointment',
  128: 'Outlook Filters',
  256: 'Address Book',
  1024: 'Interactive Workflow',
  2048: 'Offline Template',
  4096: 'Custom',
};

export function queryTypeLabel(queryType: number): string {
  return QUERY_TYPE_LABELS[queryType] ?? `Type ${queryType}`;
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (unused imports `fetchJson`/`toArray`/`buildApiUrl` will be used in Task 3 — if lint flags them now, proceed; they are consumed next task. If `npm run lint` errors on unused, temporarily add them in Task 3 within the same commit boundary — or skip lint until Task 3.)

**Step 3: Commit**

```bash
git add src/services/savedQueryService.ts
git commit -m "feat: add savedQuery summary type and querytype helper"
```

---

## Task 2: URL builders for the LocLabels messages

**Files:**
- Modify: `src/utils/urlBuilders.ts`

**Step 1: Add a RetrieveLocLabels URL builder**

Append to `src/utils/urlBuilders.ts`:

```ts
/**
 * Build a RetrieveLocLabels function URL for a record attribute.
 * Uses parameter aliases with an @odata.id entity moniker.
 */
export function buildRetrieveLocLabelsUrl(
  options: UrlBuilderOptions & {
    entitySetName: string; // e.g. 'savedqueries'
    recordId: string;
    attributeName: string;
    includeUnpublished?: boolean;
  }
): string {
  const {
    baseUrl,
    apiVersion = D365_API_VERSION,
    entitySetName,
    recordId,
    attributeName,
    includeUnpublished = true,
  } = options;
  const api = buildApiUrl(baseUrl, apiVersion);
  const guid = normalizeGuid(recordId);
  const moniker = encodeURIComponent(JSON.stringify({ '@odata.id': `${entitySetName}(${guid})` }));
  const attr = encodeURIComponent(`'${attributeName}'`);
  return `${api}/RetrieveLocLabels(EntityMoniker=@p1,AttributeName=@p2,IncludeUnpublished=@p3)` +
    `?@p1=${moniker}&@p2=${attr}&@p3=${includeUnpublished}`;
}
```

(`buildApiUrl`, `normalizeGuid`, `D365_API_VERSION`, `UrlBuilderOptions` are all already imported/defined in this file.)

**Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/utils/urlBuilders.ts
git commit -m "feat: add buildRetrieveLocLabelsUrl builder"
```

---

## Task 3: savedQueryService — list, read labels, save labels

**Files:**
- Modify: `src/services/savedQueryService.ts`
- Read first: `src/services/optionSetService.ts` (batch + merge pattern), `src/utils/batchBuilder.ts`

**Step 1: Add `listSystemViews`**

Append:

```ts
import { buildRetrieveLocLabelsUrl } from '../utils/urlBuilders';
import { buildBatchRequest, executeBatchRequest, BatchOperation } from '../utils/batchBuilder';
import { publishEntityViaWebApi } from './d365Api';
import type { Label } from '../types';

/** List all views for an entity, public views (querytype 0) first, then by name. */
export async function listSystemViews(
  baseUrl: string,
  entityLogicalName: string,
  apiVersion: string = 'v9.2'
): Promise<SavedQuerySummary[]> {
  const api = buildApiUrl(baseUrl, apiVersion);
  const select = '$select=name,description,savedqueryid,querytype,isdefault,iscustomizable';
  const filter = `$filter=returnedtypecode eq '${entityLogicalName}'`;
  const url = `${api}/savedqueries?${select}&${filter}&$orderby=name`;

  const j = await fetchJson(url);
  const rows = toArray(j?.value).map((r: any): SavedQuerySummary => ({
    savedQueryId: String(r.savedqueryid ?? ''),
    name: String(r.name ?? ''),
    description: String(r.description ?? ''),
    queryType: Number(r.querytype ?? -1),
    isDefault: Boolean(r.isdefault),
    isCustomizable: Boolean(r.iscustomizable?.Value ?? true),
  }));

  return rows.sort((a, b) => {
    const ap = a.queryType === PUBLIC_VIEW_QUERY_TYPE ? 0 : 1;
    const bp = b.queryType === PUBLIC_VIEW_QUERY_TYPE ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });
}
```

**Step 2: Add `getViewLocalizedLabels`**

```ts
/** Retrieve localized labels for one attribute (e.g. 'name') of a saved query. */
export async function getViewLocalizedLabels(
  baseUrl: string,
  savedQueryId: string,
  attributeName: string,
  apiVersion: string = 'v9.2'
): Promise<Label[]> {
  const url = buildRetrieveLocLabelsUrl({
    baseUrl,
    apiVersion,
    entitySetName: 'savedqueries',
    recordId: savedQueryId,
    attributeName,
    includeUnpublished: true,
  });
  const j = await fetchJson(url);
  return toArray(j?.Label?.LocalizedLabels).map((l: any) => ({
    languageCode: Number(l.LanguageCode),
    label: String(l.Label ?? ''),
  }));
}
```

**Step 3: Confirm the response shape (one-time manual check)**

Before relying on the parser, load the extension against a D365 env, open DevTools, and run a `RetrieveLocLabels` GET for a known view. Confirm the JSON is `{ Label: { LocalizedLabels: [...] } }`. If instead it returns a flat `Labels`/`LocalizedLabels` at the root, adjust the `toArray(...)` path in Step 2 accordingly. Note the confirmed shape in a code comment.

**Step 4: Add `saveViewTranslations` (batched SetLocLabels + publish)**

```ts
export interface ViewLabelEdit {
  attributeName: 'name' | 'description';
  labels: Label[]; // languageCode + label; empty labels filtered out
}

/** Save name/description localized labels for a view via batched SetLocLabels, then publish the entity. */
export async function saveViewTranslations(
  baseUrl: string,
  entityLogicalName: string,
  savedQueryId: string,
  edits: ViewLabelEdit[],
  apiVersion: string = 'v9.2'
): Promise<void> {
  const operations: BatchOperation[] = edits
    .filter((e) => e.labels.length > 0)
    .map((e) => ({
      method: 'POST' as const,
      url: `/api/data/${apiVersion}/SetLocLabels`,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: {
        EntityMoniker: {
          '@odata.type': 'Microsoft.Dynamics.CRM.savedquery',
          savedqueryid: savedQueryId,
        },
        AttributeName: e.attributeName,
        Labels: e.labels.map((l) => ({
          '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel',
          Label: l.label,
          LanguageCode: l.languageCode,
          IsManaged: false,
        })),
      },
    }));

  if (operations.length === 0) return;

  const batchRequest = buildBatchRequest({ baseUrl, apiVersion, operations });
  const result = await executeBatchRequest(batchRequest);
  if (!result.success) {
    throw new Error(
      `Batch SetLocLabels failed${
        result.innerErrorStatus ? ` (inner status ${result.innerErrorStatus})` : ''
      }: ${result.responseText}`
    );
  }

  await publishEntityViaWebApi(baseUrl, entityLogicalName, apiVersion);
}
```

**Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. Confirm `Label` type exists in `src/types` (it does — used by `optionSetService`).

**Step 6: Commit**

```bash
git add src/services/savedQueryService.ts src/utils/urlBuilders.ts
git commit -m "feat: savedQueryService list/read/save view translations"
```

---

## Task 4: `useSystemViews` hook

**Files:**
- Create: `src/hooks/useSystemViews.ts`

**Step 1: Implement (mirror `useEntityBrowser`)**

```ts
import { useEffect, useState } from 'react';
import { listSystemViews, type SavedQuerySummary } from '../services/savedQueryService';
import { getErrorMessage } from '../utils/errorHandling';

interface UseSystemViewsResult {
  views: SavedQuerySummary[];
  loading: boolean;
  error: string | null;
}

/** Fetch system views for an entity. Refetches when entity/clientUrl change. */
export function useSystemViews(
  clientUrl: string,
  entity: string | null,
  apiVersion?: string
): UseSystemViewsResult {
  const [views, setViews] = useState<SavedQuerySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientUrl || !entity) {
      setViews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const list = await listSystemViews(clientUrl, entity, apiVersion);
        if (!cancelled) setViews(list);
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientUrl, entity, apiVersion]);

  return { views, loading, error };
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/hooks/useSystemViews.ts
git commit -m "feat: useSystemViews hook"
```

---

## Task 5: `useViewTranslations` hook

**Files:**
- Create: `src/hooks/useViewTranslations.ts`

**Step 1: Implement**

State holds two fields (`name`, `description`), each a `Record<lcid, string>`. Load via `getViewLocalizedLabels` for both attributes; seed every provisioned LCID so inputs render even when empty.

```ts
import { useState, useCallback, useMemo } from 'react';
import {
  getViewLocalizedLabels,
  saveViewTranslations,
  type ViewLabelEdit,
} from '../services/savedQueryService';

export type ViewField = 'name' | 'description';
export type ViewFieldValues = Record<ViewField, Record<number, string>>;

const EMPTY: ViewFieldValues = { name: {}, description: {} };

interface UseViewTranslationsResult {
  values: ViewFieldValues;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  saving: boolean;
  saveError: string | null;
  hasChanges: boolean;
  load: () => Promise<void>;
  onChange: (field: ViewField, lcid: number, value: string) => void;
  save: () => Promise<void>;
  reset: () => void;
}

function seed(langs: number[], labels: { languageCode: number; label: string }[]): Record<number, string> {
  const out: Record<number, string> = {};
  const all = new Set<number>([...langs, ...labels.map((l) => l.languageCode)]);
  all.forEach((lcid) => {
    out[lcid] = labels.find((l) => l.languageCode === lcid)?.label ?? '';
  });
  return out;
}

export function useViewTranslations(
  clientUrl: string,
  entity: string,
  savedQueryId: string | null,
  langs: number[] | undefined,
  apiVersion: string = 'v9.2'
): UseViewTranslationsResult {
  const [values, setValues] = useState<ViewFieldValues>(EMPTY);
  const [original, setOriginal] = useState<ViewFieldValues>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientUrl || !savedQueryId || !langs?.length) return;
    setLoading(true);
    setError(null);
    setLoaded(false);
    try {
      const [nameLabels, descLabels] = await Promise.all([
        getViewLocalizedLabels(clientUrl, savedQueryId, 'name', apiVersion),
        getViewLocalizedLabels(clientUrl, savedQueryId, 'description', apiVersion),
      ]);
      const next: ViewFieldValues = {
        name: seed(langs, nameLabels),
        description: seed(langs, descLabels),
      };
      setValues(next);
      setOriginal(structuredClone(next));
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [clientUrl, savedQueryId, langs, apiVersion]);

  const onChange = useCallback((field: ViewField, lcid: number, value: string) => {
    setValues((prev) => ({ ...prev, [field]: { ...prev[field], [lcid]: value } }));
  }, []);

  const changedEdits = useMemo<ViewLabelEdit[]>(() => {
    const fields: ViewField[] = ['name', 'description'];
    return fields.map((field) => ({
      attributeName: field,
      labels: Object.keys(values[field])
        .map(Number)
        .filter((lcid) => (values[field][lcid] ?? '') !== (original[field][lcid] ?? ''))
        .map((lcid) => ({ languageCode: lcid, label: values[field][lcid] ?? '' })),
    })).filter((e) => e.labels.length > 0);
  }, [values, original]);

  const hasChanges = changedEdits.length > 0;

  const save = useCallback(async () => {
    if (!savedQueryId || !hasChanges) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveViewTranslations(clientUrl, entity, savedQueryId, changedEdits, apiVersion);
      setOriginal(structuredClone(values));
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [clientUrl, entity, savedQueryId, changedEdits, hasChanges, values, apiVersion]);

  const reset = useCallback(() => {
    setValues(EMPTY);
    setOriginal(EMPTY);
    setLoaded(false);
    setError(null);
    setSaveError(null);
  }, []);

  return { values, loading, error, loaded, saving, saveError, hasChanges, load, onChange, save, reset };
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/hooks/useViewTranslations.ts
git commit -m "feat: useViewTranslations hook"
```

---

## Task 6: `ViewLabelEditor` component

**Files:**
- Create: `src/components/view-translation/ViewLabelEditor.tsx`
- Read first: `src/components/global-optionset/OptionSetDetail.tsx`, `src/components/TranslationsTable.tsx`

**Step 1: Implement (reuse `TranslationsTable` per field)**

```tsx
import { makeStyles, Text, Spinner, Badge, Card, CardHeader, Divider, tokens } from '@fluentui/react-components';
import { Grid24Regular, Code24Regular } from '@fluentui/react-icons';

import Section from '../ui/Section';
import CustomButton from '../ui/Button';
import TranslationsTable from '../TranslationsTable';
import { queryTypeLabel, type SavedQuerySummary } from '../../services/savedQueryService';
import type { ViewFieldValues, ViewField } from '../../hooks/useViewTranslations';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  emptyState: { textAlign: 'center', padding: spacing.xl, color: tokens.colorNeutralForeground3 },
  spinner: { textAlign: 'center', padding: spacing.xl },
  cardPadding: { padding: spacing.md },
  dividerMargin: { margin: `${spacing.md} 0` },
  fieldBlock: { marginBottom: '24px' },
  fieldLabel: { fontWeight: tokens.fontWeightSemibold, marginBottom: spacing.sm, display: 'block' },
  badges: { display: 'flex', alignItems: 'center', gap: spacing.sm },
  actions: { display: 'flex', gap: spacing.sm, marginTop: spacing.md },
});

interface ViewLabelEditorProps {
  view: SavedQuerySummary | null;
  lcids: number[];
  langs: number[] | null;
  loading: boolean;
  values: ViewFieldValues;
  onChange: (field: ViewField, lcid: number, value: string) => void;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
  readOnly?: boolean;
}

export default function ViewLabelEditor({
  view, lcids, langs, loading, values, onChange, onSave, saving, hasChanges, readOnly = false,
}: ViewLabelEditorProps): JSX.Element {
  const styles = useStyles();

  if (!view) {
    return (
      <Section title="Select a view" icon={<Code24Regular />}>
        <div className={styles.emptyState}><Text>Select a view from the list to edit its translations.</Text></div>
      </Section>
    );
  }
  if (loading) {
    return (
      <Section title="Loading…" icon={<Code24Regular />}>
        <div className={styles.spinner}><Spinner size="large" label="Loading view translations…" /></div>
      </Section>
    );
  }

  const disabled = !langs?.length || readOnly;

  return (
    <Section title={`Translating: ${view.name}`} icon={<Grid24Regular />}>
      <Card className={styles.cardPadding}>
        <CardHeader
          header={
            <div className={styles.badges}>
              <Text weight="semibold">{view.name}</Text>
              <Badge color="informative" appearance="filled">{queryTypeLabel(view.queryType)}</Badge>
              {view.isDefault && <Badge appearance="outline">Default</Badge>}
              {!view.isCustomizable && <Badge color="warning" appearance="outline">Not customizable</Badge>}
            </div>
          }
        />
        <Divider className={styles.dividerMargin} />

        <div className={styles.fieldBlock}>
          <Text className={styles.fieldLabel}>Name</Text>
          <TranslationsTable
            lcids={lcids}
            values={values.name}
            loading={false}
            disabled={disabled}
            placeholder="(empty)"
            onChange={(lcid, v) => onChange('name', lcid, v)}
          />
        </div>

        <div className={styles.fieldBlock}>
          <Text className={styles.fieldLabel}>Description</Text>
          <TranslationsTable
            lcids={lcids}
            values={values.description}
            loading={false}
            disabled={disabled}
            placeholder="(empty)"
            onChange={(lcid, v) => onChange('description', lcid, v)}
          />
        </div>

        <div className={styles.actions}>
          <CustomButton onClick={onSave} disabled={saving || disabled || !hasChanges} variant="primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </CustomButton>
        </div>
      </Card>
    </Section>
  );
}
```

> Confirm `TranslationsTable`'s exact prop names by reading `src/components/TranslationsTable.tsx` (the usage above matches `OptionSetDetail.tsx`). If `CustomButton`'s default export path differs, copy the import line from `OptionSetDetail.tsx`.

**Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/components/view-translation/ViewLabelEditor.tsx
git commit -m "feat: ViewLabelEditor component"
```

---

## Task 7: `ViewTranslationPage`

**Files:**
- Create: `src/report/pages/ViewTranslationPage.tsx`
- Read first: `src/report/pages/GlobalOptionSetPage.tsx` (copy page scaffold/styles)

**Step 1: Implement the page**

Compose: entity `ListSelector` (from `useEntityBrowser`) + a "Public views only" toggle + view `ListSelector` (from `useSystemViews`, filtered) + `ViewLabelEditor` (driven by `useViewTranslations`). Use the same `useStyles` scaffold (`page`, `content`, `splitLayout`, `sidebar`, `detailPanel`) as `GlobalOptionSetPage`.

Key wiring details:
- `const { clientUrl, apiVersion } = useOrgContext();` then guard missing `clientUrl` with the same `ErrorBox` early-return as siblings.
- `const { langs } = useLanguages(clientUrl ?? '', apiVersion);` and `const lcids = useMemo(() => (langs ?? []).slice().sort((a,b)=>a-b), [langs]);`
- `const { isEditingBlocked } = useEditingPermission(clientUrl ?? '', apiVersion);`
- Entity: `const { entities, loading: entitiesLoading } = useEntityBrowser(clientUrl ?? '', apiVersion);` with `const [entity, setEntity] = useState<string | null>(null);`
- Views: `const { views, loading: viewsLoading, error: viewsError } = useSystemViews(clientUrl ?? '', entity, apiVersion);`
- `const [publicOnly, setPublicOnly] = useState(true);` → `const shownViews = useMemo(() => publicOnly ? views.filter(v => v.queryType === PUBLIC_VIEW_QUERY_TYPE) : views, [views, publicOnly]);`
- Selection: `const [savedQueryId, setSavedQueryId] = useState<string | null>(null);` and `const selectedView = useMemo(() => views.find(v => v.savedQueryId === savedQueryId) ?? null, [views, savedQueryId]);`
- Translations: `const tx = useViewTranslations(clientUrl ?? '', entity ?? '', savedQueryId, langs, apiVersion);`
- `useEffect(() => { tx.reset(); }, [savedQueryId, entity]);` then `useEffect(() => { if (savedQueryId) tx.load(); }, [savedQueryId, langs]);` (call `tx.load()` — it guards internally).
- When `entity` changes, also clear `savedQueryId` (`setSavedQueryId(null)`).
- `document.title = 'View Translations - D365 Translator';` in a `useEffect`.
- Header: `PageHeader` title "View Translation Manager", subtitle "Translate system view names and descriptions", icon `<Grid24Regular />`, `connectionInfo={{ clientUrl, apiVersion }}`, theme toggle action (copy from `GlobalOptionSetPage`).
- Show `EditingBlockedBanner`, `tx.error`/`tx.saveError`/`viewsError` via `ErrorBox`.

Entity `ListSelector` props: `items={entities}`, `getItemKey={(e)=>e.LogicalName}`, `getDisplayName={getEntityDisplayName}`, `getMetaText={(e)=>e.LogicalName}`, `selectedItem={entity}`, `onSelectItem={(k)=>{ setEntity(k); setSavedQueryId(null); }}`, `loading={entitiesLoading}`. Import `getEntityDisplayName` from `entityMetadataService`.

View `ListSelector` props: `items={shownViews}`, `getItemKey={(v)=>v.savedQueryId}`, `getDisplayName={(v)=>v.name}`, `getMetaText={(v)=>queryTypeLabel(v.queryType)}`, `selectedItem={savedQueryId}`, `onSelectItem={setSavedQueryId}`, `loading={viewsLoading}`, `title="Views"`. Render the `publicOnly` `Switch` (from `@fluentui/react-components`) just above this selector.

`ViewLabelEditor` props: `view={selectedView}`, `lcids`, `langs={langs ?? null}`, `loading={tx.loading}`, `values={tx.values}`, `onChange={tx.onChange}`, `onSave={tx.save}`, `saving={tx.saving}`, `hasChanges={tx.hasChanges}`, `readOnly={isEditingBlocked}`.

Layout: use a 3-area grid — entity sidebar, view sidebar, detail. Simplest: reuse `splitLayout` with `gridTemplateAreas: "entities views detail"` on wide screens, stacking on narrow. Or nest two `ListSelector`s in one sidebar column above the detail. Pick the stacked-sidebars option for simplicity (entity selector then view selector in the left column, editor on the right) to match the 2-column `splitLayout` already proven in `GlobalOptionSetPage`.

**Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/report/pages/ViewTranslationPage.tsx
git commit -m "feat: ViewTranslationPage"
```

---

## Task 8: Register the route

**Files:**
- Modify: `src/report/AppRouter.tsx`

**Step 1: Add lazy import + route**

After the other `lazy(...)` lines:
```ts
const ViewTranslationPage = lazy(() => import('./pages/ViewTranslationPage'));
```
Inside `<Routes>`, alongside the others:
```tsx
<Route path="/view-translations" element={<ViewTranslationPage />} />
```

**Step 2: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS; build emits the new chunk.

**Step 3: Commit**

```bash
git add src/report/AppRouter.tsx
git commit -m "feat: register /view-translations route"
```

---

## Task 9: Launcher wiring (popup button → page)

Follow the exact `OPEN_GLOBAL_OPTIONSETS` pattern across these files. Read each reference line before editing.

**Files:**
- Modify: `src/types/chromeExtension.ts` (ControllerMethod union)
- Modify: `src/controller/pageController.ts`
- Modify: `src/relay/relay.ts`
- Modify: `src/background.ts`
- Modify: `src/hooks/useD365Controller.ts`
- Modify: `src/popup/App.tsx`
- Modify: `src/popup/components/GeneralTab.tsx`
- Modify: tooltip key source for `TooltipKey` (find via `Grep pattern="globalOptionSets" src/types`)

**Step 1: ControllerMethod union** — add `| 'openViewTranslationsPage'` to the union in `src/types/chromeExtension.ts:40-49`.

**Step 2: pageController** — add an `openViewTranslationsPage()` method to the `ctl` object (copy `openGlobalOptionSetsPage`, lines ~98-119) posting `type: "OPEN_VIEW_TRANSLATIONS"`. Also add `openViewTranslationsPage: () => Promise<void>;` to the `ctl` type literal (lines 60-71). Ensure it's exposed on `window.__d365Ctl` the same way `openGlobalOptionSetsPage` is (search for where the methods are attached).

**Step 3: relay** — in `src/relay/relay.ts`, add a block mirroring lines 31-36:
```ts
if (d.type === 'OPEN_VIEW_TRANSLATIONS') {
  chrome.runtime.sendMessage({ type: 'OPEN_VIEW_TRANSLATIONS', payload: d.payload });
}
```

**Step 4: background** — in `src/background.ts`, add an `else if` mirroring the `OPEN_GLOBAL_OPTIONSETS` handler (lines 42-52):
```ts
} else if (msg?.type === "OPEN_VIEW_TRANSLATIONS") {
  const { clientUrl, apiVersion } = msg.payload ?? {};
  if (!clientUrl) return;
  const base = chrome.runtime.getURL("src/report/report.html");
  const qs = `?clientUrl=${encodeURIComponent(clientUrl)}${apiVersion ? `&apiVersion=${encodeURIComponent(apiVersion)}` : ""}`;
  const url = `${base}#/report/view-translations${qs}`;
  chrome.tabs.create({ url }).catch(() => {});
}
```

**Step 5: useD365Controller** — add an `openViewTranslationsPage` action mirroring `openGlobalOptionSetsPage` (lines 139-147) and include it in the returned object (lines 208-224).

**Step 6: popup App.tsx** — destructure `openViewTranslationsPage` from the hook (near line 103) and pass `onOpenViewTranslations={openViewTranslationsPage}` to `<GeneralTab>` (near line 288).

**Step 7: GeneralTab** — add `onOpenViewTranslations: () => void;` to `GeneralTabProps` (near line 72), destructure it (near line 86), and add an `ActionButton` in the "Translation Tools" group (after the Entity Browser button, ~line 201):
```tsx
<ActionButton
  icon={<Grid24Regular />}
  onClick={onOpenViewTranslations}
  disabled={busy || !isDynamicsEnv || contextChecking}
  onMouseEnter={() => onHoverButton('viewTranslations')}
  onMouseLeave={() => onHoverButton(null)}
  tooltipKey="viewTranslations"
>
  View Translations
</ActionButton>
```
Use an icon already imported there (e.g. `Grid24Regular`) or import one (e.g. `Table24Regular`).

**Step 8: TooltipKey** — add `'viewTranslations'` to the `TooltipKey` union (`Grep pattern="globalOptionSets"` to find the file in `src/types`), and add a tooltip entry wherever the `globalOptionSets` tooltip text is defined (`Grep pattern="globalOptionSets" src` → the tooltip content map). Provide text like: "Translate system view names and descriptions across languages."

**Step 9: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS. The union additions force the compiler to catch any missed wiring site.

**Step 10: Commit**

```bash
git add src/types/chromeExtension.ts src/controller/pageController.ts src/relay/relay.ts src/background.ts src/hooks/useD365Controller.ts src/popup/App.tsx src/popup/components/GeneralTab.tsx
git commit -m "feat: launcher wiring for view translations page"
```

---

## Task 10: Version bump + final verification

**Files:**
- Modify: `public/manifest.json` (bump `version`)

**Step 1: Bump version** — increment the patch/minor `version` in `public/manifest.json` per the repo's convention (check recent bumps via `git log -- public/manifest.json`).

**Step 2: Full build gate**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all PASS, `dist/` produced.

**Step 3: Manual D365 verification**

1. Load `dist/` as an unpacked extension in Chrome.
2. Open a D365 page → extension popup → "View Translations" → new tab opens on `#/report/view-translations`.
3. Select an entity (e.g. Account) → public views listed first; toggle "Public views only" off → all view types appear with querytype badges.
4. Select a view → existing localized name/description populate per language.
5. Edit a non-base-language name + description → Save → success info, no error.
6. Confirm persistence: reselect the view (or re-run `RetrieveLocLabels` in DevTools) → edited values present. Optionally switch D365 UI language and confirm the view name shows translated.
7. Confirm a non-customizable/managed view either saves or surfaces a clear API error (no silent failure).

**Step 4: Commit**

```bash
git add public/manifest.json
git commit -m "chore: bump manifest version for view translations page"
```

---

## Done

Feature complete: list system views per entity, edit name + description across languages, save via batched `SetLocLabels`, publish, with a discoverable popup launcher. All gates green and manually verified against a live D365 org.
