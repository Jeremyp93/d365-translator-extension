# View Translation Page — Design

**Date:** 2026-06-18
**Status:** Approved (brainstorming)

## Goal

Add a report page that translates the **name** and **description** of D365 **system views** (`savedquery`), mirroring the existing Global OptionSet translation page. Entity-first navigation, one editable input per enabled language.

## Scope

- **In:** System views (`savedquery`) `name` + `description` localization.
- **Out:** Personal views (`userquery`); column headers (already covered by the Field Report page, since headers are attribute DisplayNames).

## Architecture

Entity-first, three zones reusing the existing `splitLayout` grid pattern:

```
[ Entity list ]  →  [ View list for entity ]  →  [ Name + Description editor (one input per language) ]
```

Reused scaffolding (identical to `GlobalOptionSetPage` / `EntityAttributeBrowserPage`):
`useEntityBrowser` + `ListSelector` (entity selection), `PageHeader`, `EditingBlockedBanner`,
`useEditingPermission`, `useLanguages`, `useOrgContext`, theme toggle.

## View list behavior

- List **all** view types for the selected entity.
- **Public views first** (`querytype eq 0`), then the rest.
- A **"Public views only"** toggle (`Switch`, default **on**) filters to `querytype 0`.
- Show `querytype` as a badge and an `iscustomizable` indicator.

## New service — `src/services/savedQueryService.ts`

API shapes verified against Microsoft Learn (`SetLocLabels` Action, `RetrieveLocLabels` Function).

| Function | Web API call |
|-|-|
| `listSystemViews(baseUrl, entity, apiVersion)` | `GET savedqueries?$select=name,description,savedqueryid,querytype,isdefault,iscustomizable&$filter=returnedtypecode eq '<entity>'&$orderby=name` |
| `getViewLocalizedLabels(baseUrl, savedQueryId, attributeName, apiVersion)` | `GET RetrieveLocLabels(EntityMoniker=@p1,AttributeName=@p2,IncludeUnpublished=@p3)?@p1={'@odata.id':'savedqueries(<guid>)'}&@p2='<attr>'&@p3=true` |
| `setViewLabels(baseUrl, savedQueryId, edits, apiVersion)` | `POST SetLocLabels` per attribute (`name`, `description`), batched via `batchBuilder` |

`SetLocLabels` request body:
```json
{
  "EntityMoniker": { "@odata.type": "Microsoft.Dynamics.CRM.savedquery", "savedqueryid": "<guid>" },
  "AttributeName": "name",
  "Labels": [
    { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Comptes actifs", "LanguageCode": 1036, "IsManaged": false }
  ]
}
```

Add a `buildSavedQueryUrl` / record-moniker helper to `urlBuilders.ts` (never hand-build URLs).

**Verification point during implementation:** confirm the exact `RetrieveLocLabels` *response* JSON shape
(`Label.LocalizedLabels[]` vs flat `Labels[]`) against a live response before parsing.

## Hooks

- `useSystemViews(clientUrl, entity, apiVersion)` → `{ views, loading, error }`.
- `useViewTranslations(clientUrl, savedQueryId, apiVersion)` → loads name + description localized labels into
  editable state; exposes `onChange`, `onSave`, `saving`. Mirrors `useOptionSetTranslations`.

## Component — `ViewLabelEditor.tsx`

Given selected view + `langs`, renders a row of language inputs for **name** and **description**, plus a Save button.
Reuses the localized-label input pattern from the option-set editor. On save:
`setViewLabels` (batch) → `publishEntityViaWebApi(entity)` so translated names surface in D365.

## Launcher wiring (full, for parity)

Same five-link chain the option-set page uses:
- `pageController.ts`: `openViewTranslationsPage()` posts `OPEN_VIEW_TRANSLATIONS`.
- `relay.ts`: forward `OPEN_VIEW_TRANSLATIONS`.
- `background.ts`: open `report.html#/report/view-translations`.
- `AppRouter.tsx`: `<Route path="/view-translations" .../>` + lazy import.
- popup hook (`useD365Controller`) + popup button component: add the entry.

## Error handling

- Missing `clientUrl` → `ErrorBox` guard (same as siblings).
- `EditingBlockedBanner` + `readOnly` from `useEditingPermission`.
- Per-view load / save failures surfaced via `ErrorBox` / `Info`.
- Managed / non-customizable views: show indicator; surface raw API error if `SetLocLabels` is rejected.

## Testing

No test framework configured. Manual: `npm run build` → load `dist/` unpacked → open against a D365 env →
select entity → select view → edit a non-base-language name → save → confirm via language switch / re-run
`RetrieveLocLabels`. Plus `npx tsc --noEmit` and `npm run lint`.

## Conventions

Functional components, no `any`, named exports, ~150 LOC files, Fluent UI components/tokens, layer separation
(`services` framework-agnostic, `hooks` for state, `components` for view). Version bump in `public/manifest.json`.
