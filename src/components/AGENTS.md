# AGENTS.md — src/components

Component Rules:
- Functional components only.
- Components should mostly render and handle UI events; heavy logic belongs in hooks/services.
- Prefer Fluent UI components; avoid inline styles except truly dynamic.
- Accessibility is mandatory:
  - semantic elements (button vs clickable div)
  - labels/aria where needed
  - keyboard navigation
- Look for repeated UI patterns and extract reusable components.
- Keep files around ~150 LOC when possible; split responsibilities.
