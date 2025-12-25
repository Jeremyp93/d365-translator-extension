# AGENTS.md — src/controller

Content script / controller rules:
- Treat DOM as untrusted input; avoid unsafe HTML injection.
- Use safe query/select patterns; handle missing elements gracefully.
- Isolated world considerations: don’t rely on page globals.
- Use typed message payloads when communicating with background/popup.
- Keep side effects localized; avoid global mutable state.
