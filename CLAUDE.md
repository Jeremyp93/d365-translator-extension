# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) for managing multilingual translations in Microsoft Dynamics 365. Built with React 18, TypeScript (strict), Vite, and Fluent UI. Targets `*.dynamics.com` hosts.

## Build & Development Commands

| Command | Purpose |
|-|-|
| `npm run build` | Production build to `dist/` |
| `npm run build-dev` | Dev build (sourcemaps, no minification) |
| `npm run dev` | Dev server with hot reload |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript type check |

No test framework is configured. Manual testing is done by loading `dist/` as an unpacked extension in Chrome and testing against a D365 environment.

## Architecture

### Multi-Entry Build (vite.config.ts)

The extension has multiple isolated entry points that communicate via Chrome messaging APIs:

- **`src/background.ts`** — MV3 service worker. No persistent memory; uses `chrome.storage`.
- **`src/popup/`** — Toolbar popup UI (quick actions).
- **`src/sidepanel/`** — Chrome side panel UI.
- **`src/controller/pageController.ts`** — Content script injected into D365 pages (field highlighting). Has NO access to Chrome Extension APIs; communicates via the relay.
- **`src/relay/relay.ts`** — Message relay between page context and extension.
- **`src/report/report.html`** — Full-screen React SPA with React Router. Contains 5 pages: Entity Browser, Field Report, Form Structure, Global OptionSets, Plugin Trace Logs.
- **`src/modal/modal.html`** — Field modal rendered as an iframe SPA.

### Layer Separation (Enforced)

```
src/services/   → Framework-agnostic. NO React imports. D365 Web API calls + business logic.
src/hooks/      → React hooks. Fetching, state transitions, expose data + actions to components.
src/components/ → View + event wiring only. Use Fluent UI components, not custom styling.
```

### Path Aliases (tsconfig/vite)

`@` → `src/`, `@services`, `@hooks`, `@ui`, `@pages`, `@components`, `@report`

### Key Utilities

- **`src/utils/urlBuilders.ts`** — All D365 Web API URLs must use these builders (never construct URLs manually). See CONTRIBUTING.md for full API.
- **`src/config/constants.ts`** — API version (`D365_API_VERSION = 'v9.2'`), cache TTLs, batch settings, form types.

## Code Conventions

- **Functional components only** (no class components).
- **No `any`, `as any`, `@ts-ignore`** without documented justification.
- **Naming**: PascalCase for components/types, camelCase for functions/variables/hooks, kebab-case for filenames.
- **File size target**: ~150 LOC. Split when responsibilities grow.
- **Named exports** preferred.
- Prefer Fluent UI components and tokens over custom/inline styles.
- Use semantic HTML (`<button>` not clickable `<div>`).

## D365 Web API Rules

- Paginate using `@odata.nextLink`; default page size 100.
- Batch operations: max ~50 ops/batch, handle partial failures.
- Use `credentials: 'include'` for D365 session auth.
- Publish each entity once per bulk save cycle.

## Chrome Extension (MV3) Rules

- Service worker: no persistent in-memory state, use `chrome.storage`.
- Validate message sender + payload shape for all cross-context messages.
- No `eval`, no unsafe inline scripts (CSP compliance).
- Principle of least privilege for permissions.

## Workflow

- Protected `main` branch; all changes via PRs from `feature/` branches.
- PRs get automated reviews from CodeRabbit and Claude Code (configured in `.github/workflows/`).
- Review checklist: CODE_REVIEW.md. Agent review instructions: AGENTS.md.
- Version is in `public/manifest.json`.
