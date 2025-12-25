# AGENTS.md — src

General rules for all src/ code:
- Keep architecture boundaries clean: services (logic) vs hooks (state/effects) vs components (UI).
- Prefer named exports where it improves consistency.
- TypeScript strict: avoid `any`, `@ts-ignore`, and unsafe casts.
- Ensure React hooks dependencies are correct; avoid stale closures.
- Avoid unnecessary re-renders; memoize only where it has clear benefit.

Extension runtime considerations:
- Background/service worker code must tolerate restarts (no persistent in-memory assumptions).
- Message passing should validate payload shapes (typed contracts).
- Treat DOM as untrusted input whenever you interact with page content.
