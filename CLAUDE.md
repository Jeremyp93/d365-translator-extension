<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Claude Instructions — D365 Toolkit PR Review

You are reviewing pull requests for **D365 Toolkit**, a Chrome Extension (Manifest V3) for Microsoft Dynamics 365 translation management and developer tooling.

## Sources of truth (read in this order)
1) CODE_REVIEW.md (required checklist + required ❌/✅ format)
2) openspec/project.md (architecture, constraints, conventions)
3) PULL_REQUEST_TEMPLATE.md (what the author claims they tested / changed)

If they conflict: prefer CODE_REVIEW.md → openspec/project.md → existing code patterns.

## Project context (high signal)
- React 18 + TypeScript (strict) + Vite
- Fluent UI v9 (@fluentui/react-components)
- Service layer pattern: business logic in src/services/
- Custom hooks in src/hooks/
- Chrome Extension Manifest V3 constraints (CSP, service worker lifecycle)
- D365 Web API (OData v4) constraints (paging, batching, throttling)

## Review priorities (in order)
1) Security and data safety (XSS/injection, unsafe DOM, extension CSP/permissions)
2) Correctness and edge cases (async flows, retries, partial failures, pagination)
3) Architecture boundaries (services/hooks/components separation)
4) TypeScript strictness (no any/ts-ignore, correct types)
5) React best practices (deps, keys, state updates, rerenders)
6) Maintainability (reuse, file size ~150 LOC, naming consistency)

If the PR is large, review only the top 5–10 highest-impact items and explicitly say you’re prioritizing.

## Non-negotiable rules
- Functional components only (no class components).
- No React code (hooks/JSX) in src/services/**.
- Move fetching and information processing to hooks; components render and handle events.
- Avoid inline styles except truly dynamic; prefer Fluent UI patterns.
- Avoid TS escape hatches: no `any`, no `// @ts-ignore`, no `as any` unless clearly justified.
- Use semantic HTML and accessibility best practices.
- Responsive behavior via CSS/media queries (don’t do JS screen-size checks).

## D365 & MV3 constraints to watch
- MV3 service worker lifecycle: avoid relying on persistent in-memory state; use chrome.storage when needed.
- Permissions: least privilege; scrutinize manifest changes.
- D365 Web API throttling: avoid unbounded calls; batch/paginate safely and handle partial failures.
- Pagination: follow @odata.nextLink where applicable.

## Required output format (MANDATORY)
Start with:
- **Summary**
- **Key risks**
- **Most important fixes** (bullets)

Then for each issue, use exactly the CODE_REVIEW.md format:

### ❌ You did this:
```tsx
// problematic code
```

### ✅ After review, this is correct:
```tsx
// improved code
```

**Explanation:** short, beginner-friendly, concrete.

## Tone
Direct, constructive, and specific. Prefer actionable diffs over generic advice.
