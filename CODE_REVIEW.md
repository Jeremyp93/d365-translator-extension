# CODE_REVIEW.md — D365 Toolkit (Chrome Extension, MV3)

This document defines the expectations for code reviews in this repository. It is used by both humans and automated reviewers (CodeRabbit / Claude).

## Review Priorities (in order)
1. **Security** (XSS, unsafe message passing, unsafe APIs, permissions/CSP)
2. **Correctness** (data integrity, edge cases, error handling)
3. **Architecture** (service layer separation, hooks/components responsibilities)
4. **Performance** (bundle size, re-renders, API throttling, batching)
5. **Maintainability** (typing quality, readability, naming, file size)
6. **UX & Accessibility** (Fluent UI usage, keyboard nav, semantics)

---

## Required Issue Format (❌ / ✅)
When leaving review notes (human or bot), use one of these per item:

- ❌ **[Severity: Blocking | Important | Suggestion]** `path/to/file.tsx` — short title  
  - What’s wrong + why it matters  
  - Proposed fix (concrete)

- ✅ `path/to/file.ts` — short praise (optional, brief)

---

## TypeScript (Strict Mode)
**Must**
- No `any`, `as any`, `// @ts-ignore` escape hatches unless absolutely necessary (and documented with rationale).
- Prefer explicit typing for:
  - API responses / DTOs
  - service inputs/outputs
  - custom hook return types
- Use union types / enums for fixed sets of values (avoid stringly-typed code).
- Use typed errors (custom error types) for service failures.

**Should**
- Avoid over-wide types (`Record<string, unknown>` everywhere) unless a boundary truly requires it.
- Avoid excessive casting; fix types at the source.

---

## React (Functional Components + Hooks)
**Must**
- **Functional components only** (no class components).
- Proper hook usage:
  - Correct dependency arrays in `useEffect`, `useMemo`, `useCallback`.
  - No stale closures.
- All `.map()` render loops must have stable, unique `key`.
- Components are primarily “view + event wiring”; logic belongs in hooks/services.
- Avoid prop drilling for deep trees; prefer context where appropriate.

**Should**
- Extract repeated patterns and long logic (>15–20 lines) into custom hooks or helper functions.
- Watch for unnecessary re-renders (unstable inline callbacks/objects, missing memoization where needed).

---

## Architecture Rules
### Services (`src/services/**`)
**Must**
- Framework-agnostic: **no React imports**, no hooks, no component logic.
- Centralize business logic + D365 Web API calls here.
- Typed errors and consistent error handling strategy.
- Clear separation of concerns (one service per domain area).

**Should**
- Cache where appropriate (respect memory limits and invalidation rules).
- Keep service APIs small and stable.

### Hooks (`src/hooks/**`)
**Must**
- Hook names start with `use*`.
- Typed return values and documented behavior (what it does, what it returns, any side effects).
- Correct dependency arrays (no disabling lint rules to “make it work”).

**Should**
- Encapsulate fetching/state transitions and expose simple data + actions to components.

### Components (`src/components/**`)
**Must**
- Fluent UI components preferred; avoid custom styling unless necessary.
- Avoid inline styles except for truly dynamic cases.
- Use semantic HTML where possible (buttons/forms/headers instead of clickable divs).

---

## Chrome Extension (Manifest V3)
**Must**
- MV3-compliant service worker patterns:
  - No reliance on persistent in-memory background state.
  - Use `chrome.storage` for persisted data.
- Validate message passing:
  - Verify sender + payload shape
  - Avoid trusting data from page context
- Permissions:
  - Request only what’s necessary (principle of least privilege).
- CSP:
  - No `eval`, no unsafe inline scripts.
  - Avoid injecting unsafe HTML.

**Should**
- Keep content scripts isolated; respect “isolated world” constraints.
- Keep message schemas explicit (types/interfaces) and versionable.

---

## Dynamics 365 Web API (OData v4)
**Must**
- Respect throttling and pagination:
  - Use `@odata.nextLink` for paging
  - Keep configurable max page sizes (default 100)
- For batch operations:
  - Split into safe batch sizes (recommended max ~50 ops/batch)
  - Handle partial failures cleanly
- Use `credentials: 'include'` and ensure calls work with the existing D365 session.

**Should**
- Ensure entity publishing optimization (publish each entity once per bulk save cycle).
- Avoid repeated metadata calls; cache where appropriate with safe invalidation.

---

## Security Checklist
**Must**
- No XSS vectors:
  - Do not render untrusted HTML (no `dangerouslySetInnerHTML` unless sanitized and justified).
  - Sanitize / escape user-provided or remote strings before inserting into DOM contexts.
- Validate all cross-context messages (popup ↔ content scripts ↔ background).
- Avoid leaking sensitive org URLs, tokens, or data in logs.

**Should**
- Prefer allowlists over blocklists for message actions / event types.
- Defensive coding around D365 response content and field labels.

---

## Fluent UI + Styling
**Must**
- Prefer Fluent UI components and tokens.
- Avoid inline styles for static layout/styling.
- Ensure accessibility basics:
  - `alt` for images
  - ARIA labels where needed
  - Keyboard navigation works (focus order, escape/enter behaviors)

**Should**
- Keep UI consistent with Microsoft design patterns.
- Use responsive CSS for report pages (avoid JS “screen size” logic).

---

## Code Organization
**Must**
- Naming conventions:
  - React components & TS types: **PascalCase**
  - functions/variables/hooks: **camelCase**
  - multi-word filenames: **kebab-case**
- Keep files ~150 LOC when possible; split when responsibilities grow.
- Named exports preferred.

**Should**
- Move pure utilities to `src/utils/` (no hooks, no JSX).
- Keep route/config constants centralized (`src/config/**`).

---

## PR Expectations (Author Checklist)
**Must**
- PR description explains:
  - What changed + why
  - Any user-facing behavior changes
  - Manual test steps (since automated testing may be limited)
- Update docs/specs when behavior or patterns change (CLAUDE.md / openspec/project.md / relevant docs).
- No new lint errors (ShellCheck / Markdownlint where applicable).

**Should**
- Include screenshots/video for UI changes.
- Call out performance implications (bundle size, new deps, large UI trees).
- If touching bulk operations: mention batching strategy and failure behavior.

---

## Quick “Red Flags”
- `any`, `as any`, `@ts-ignore` without strong justification
- React logic creeping into services
- Unvalidated message payloads across extension boundaries
- Inline styles everywhere instead of Fluent UI + tokens
- Missing pagination / missing batching / no partial failure handling in bulk saves
- Large PRs without a clear summary + test steps
