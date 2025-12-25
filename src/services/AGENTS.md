# AGENTS.md — src/services

Service Layer Rules:
- Framework-agnostic business logic only.
- No React imports, hooks, or JSX.
- Strong typing for API requests/responses (interfaces/types).
- Prefer small composable functions; avoid “god services”.
- Errors must be actionable (typed errors + meaningful messages).
- D365 Web API:
  - Handle pagination via @odata.nextLink.
  - Avoid unbounded parallel calls; respect throttling.
  - If batching, split into multiple batches (e.g., ~50 ops) and handle partial failures.
