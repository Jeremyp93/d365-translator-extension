# AGENTS.md — src/hooks

Hooks Rules:
- Custom hooks must be named `use*`.
- Data fetching and processing belongs here (not in components).
- Dependencies must be correct; avoid stale closures.
- Expose a clean API: return values and actions should be well-typed and easy to consume.
- Prefer splitting hooks if they exceed a single responsibility (fetching vs transformation vs UI state).
