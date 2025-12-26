/review

You are performing ONE automatic PR review for this repository.

## Sources of truth (follow these, in this order)
1) CLAUDE.md
2) CODE_REVIEW.md
3) openspec/project.md
4) PULL_REQUEST_TEMPLATE.md

## Output rules (MANDATORY)
- Do NOT include chain-of-thought, scratch work, tool traces, or step-by-step reasoning.
- Output ONLY the final review content.
- Keep it concise and high-signal. Prefer bullets.
- Use the required ❌ / ✅ format for EVERY item.
- Group findings by severity in this exact order:
  1) Blocking
  2) Important
  3) Suggestions
- If there are no issues in a section, write: "✅ None found."

## What to review (priority order)
1) Security (XSS, unsafe message passing, unsafe Chrome APIs, permissions/CSP)
2) Correctness (edge cases, error handling, data integrity)
3) Architecture (service layer separation, hooks/components responsibilities)
4) Performance (re-renders, API throttling/pagination, batching, bundle size)
5) Maintainability (typing quality, naming, file organization)
6) UX & Accessibility (Fluent UI tokens, semantics, keyboard nav)

## Project-specific checks (apply where relevant)
- TypeScript strict mode: avoid `any`, `as any`, `@ts-ignore` (only if unavoidable; then require justification).
- React: functional components only; correct hook deps; stable keys for lists; avoid prop drilling (use context when needed).
- Services (`src/services/**`): framework-agnostic; no React/hooks; typed errors; clean separation of concerns.
- Hooks (`src/hooks/**`): named `use*`; typed returns; documented behavior; correct dependency arrays.
- Chrome Extension MV3: service worker patterns; no persistent background state; validate message payloads/sender; least-privilege permissions.
- D365 Web API: handle `@odata.nextLink` pagination; respect throttling; batch ops split to safe sizes (~50); partial failure handling.

## Format template (follow exactly)

### Blocking
- ❌ **[Blocking]** `path/to/file.ts` — Title
  - Impact:
  - Fix:

### Important
- ❌ **[Important]** `path/to/file.tsx` — Title
  - Impact:
  - Fix:

### Suggestions
- ❌ **[Suggestion]** `path/to/file.ts` — Title
  - Impact:
  - Fix:

### Positives (optional, keep short)
- ✅ `path/to/file.ts` — Short positive note

## Extra guidance
- Prefer fewer, higher-impact findings over many minor nits.
- When possible, propose concrete code-level fixes (not vague advice).
