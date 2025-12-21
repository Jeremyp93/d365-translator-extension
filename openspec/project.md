# Project Context

## Purpose
D365 Toolkit is a Chrome browser extension that provides multiple productivity tools for Microsoft Dynamics 365 administrators and developers. The extension features a modular menu system with different toolsets:

### Translation Tools
- Highlight fields on a Dynamics 365 form and view their display-name translations in all provisioned languages
- Edit and save form field labels across multiple languages (LCIDs) through an intuitive UI
- View comprehensive field and form reports with translation status
- Export/import translations for offline editing
- **Bulk Translation Editing**: Accumulate multiple translation changes in a cart and save them in batch operations
  - Pending changes cart with badge showing count of unsaved edits
  - Review modal showing all pending changes grouped by entity
  - Batch save operation with partial failure handling
  - Entity publishing optimization (publish each entity only once)
  - Unsaved changes warning when navigating away
  - Support for up to 200 pending changes with automatic batching

### Developer Tools
- **Plugin Trace Log Viewer**: Monitor and review plugin trace logs with advanced features
  - Server-side pagination with infinite scroll for large datasets
  - Filter logs by type code, entity, message, and date range
  - **Correlation Flow Visualization**: Interactive swimlane diagrams showing complete execution flow
    - React Flow-based diagrams organized by depth and execution order
    - Node details showing operation type, stage, duration, and exceptions
    - Click nodes to navigate to corresponding table rows
    - Bidirectional sync between table and diagram
    - On-demand fetching with LRU cache (up to 20 correlations)
  - Loading states for initial load and "loading more" operations
  - Export logs for offline analysis

### Future Expansion
The architecture is designed to accommodate additional D365 toolsets as new use cases emerge, maintaining a unified extension experience while keeping features modular and organized.

The primary goal is to streamline common D365 administrative and development workflows, reducing the need to navigate through multiple Power Platform interfaces for routine tasks.

## Tech Stack
- **TypeScript** (strict mode enabled)
- **React 18** with React Router for SPA navigation
- **Fluent UI v9** (@fluentui/react-components) for consistent Microsoft design system
- **React Flow** (reactflow) for interactive flow diagrams and visualizations
- **Vite** for fast builds and development
- **Chrome Extension Manifest V3** architecture
- **Dynamics 365 Web API** (OData v4.0) for data operations
- **JSZip** for export/import functionality

## Project Conventions

### Code Style
- **TypeScript strict mode** enforced via tsconfig.json
- **Functional React components** with hooks (no class components)
- **PascalCase** for React components and TypeScript types/interfaces
- **camelCase** for functions, variables, and hooks
- **kebab-case** for file names containing multiple words
- **Explicit typing**: Prefer explicit types over implicit `any`
- **Named exports** for components and services
- **2-space indentation** (consistent across the codebase)
- **Single quotes** for strings in TypeScript/JSX
- **Semicolons** required at statement ends

### Naming Conventions
- **State variables**: `camelCase` (e.g., `isLoading`, `userList`, `selectedItem`)
- **Event handlers**: `handle + Action` or `on + Action` pattern
  - Examples: `handleClick`/`onClick`, `handleSubmit`/`onSubmit`, `handleInputChange`/`onInputChange`
  - Form events: `handleFormSubmit`/`onFormSubmit`, `handleFormReset`/`onFormReset`
  - Mouse events: `handleMouseEnter`/`onMouseEnter`, `handleMouseLeave`/`onMouseLeave`
  - Keyboard events: `handleKeyDown`/`onKeyDown`, `handleKeyPress`/`onKeyPress`
  - Focus events: `handleFocus`/`onFocus`, `handleBlur`/`onBlur`
- **Functions**: `camelCase` with descriptive names (e.g., `fetchUserData`, `validateForm`)
- **Components**: `PascalCase` (e.g., `UserCard`, `LoginForm`)

### TypeScript Best Practices
- **Avoid TypeScript Escape Hatches**: Remove `// @ts-ignore` comments, replace `any` types, and avoid `as any` casting - fix the actual type issues instead
- **Use Proper Type Definitions**:
  - Define interfaces for objects and API responses
  - Use union types (`string | number`) instead of `any`
  - Use enums for fixed set of values instead of string literals
  - Define proper component prop types with `interface` or `type`
- **Common TypeScript Patterns**:
  - Use generic types for reusable components `<T>`
  - Properly type event handlers (e.g., `React.ChangeEvent<HTMLInputElement>`)
  - Use utility types like `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`
  - Define return types for functions when not obvious
- **React + TypeScript Specific**:
  - Use `React.FC<Props>` or function component typing
  - Properly type hooks like `useState<Type>(initial)`
  - Type custom hooks return values

### Architecture Patterns
- **Service Layer Pattern**: Business logic isolated in `/services` directory (d365Api.ts, formLabelService.ts, entityLabelService.ts, etc.)
- **Custom Hooks Pattern**: React state management abstracted into hooks in `/hooks` directory (useFormLabels.ts, useLanguages.ts, etc.)
  - Move all fetching logic and information processing to hooks
  - Components should only display the view and catch events
  - Create custom hooks and share them between components when patterns repeat
- **Component Composition**: UI components in `/components` with reusable primitives in `/components/ui`
  - Use compound component pattern for file structures or components composed of more than one section
  - Extract repeated UI patterns into reusable components (buttons, inputs, cards, modals, etc.)
- **Content Script Architecture**: Uses relay pattern for Chrome extension message passing between popup, content scripts, and background worker
- **Context API**: Theme management via React Context (ThemeContext.tsx)
  - Use Context API when necessary to share information between components
- **Path Aliases**: Vite configured with aliases (@, @services, @hooks, @ui, @pages, @components, @report)
- **Responsive Design**: Report pages are designed to be responsive and work across different screen sizes, adapting layouts for desktop and mobile viewing
  - Use media queries and CSS for responsive design, not JavaScript for screen size validation
- **Separation of Concerns**:
  - `/popup`: Extension popup UI (fixed width for consistent extension UX)
  - `/report`: Separate SPA for comprehensive reporting (responsive, full-page views)
  - `/controller`: Page manipulation logic
  - `/relay`: Message passing between extension contexts
  - `/background`: Service worker for Chrome extension
  - `/utils`: Pure JavaScript utilities (date formatting, string manipulation, validation, calculations)
  - `/config`: Centralized configuration (API endpoints, routes, environment-specific configs)

### React Best Practices
- Ensure all `.map()` items have unique `key` props
- Check for proper dependency arrays in `useEffect`
- Verify state updates are handled correctly
- **Data Structure & Mapping**: Convert repetitive JSX patterns to use `.map()` with array of objects
- **Code Organization & Custom Hooks**: Extract functions longer than 15-20 lines or repeated patterns into custom hooks:
  - API calls and data fetching logic
  - Form handling and validation
  - Click outside detection, screen size/viewport detection
  - Local storage operations
  - Toggle states and modal management
  - Timer/interval logic, debounced inputs
  - Any repeated useEffect + useState combinations
- **HTML Semantic Tags**: Replace generic `<div>` with semantic HTML5 tags:
  - Use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`
  - Use `<button>` instead of clickable `<div>`
  - Use `<form>` for form elements
- **Accessibility**:
  - Ensure all `<img>` tags have `alt` attributes
  - Check for proper ARIA labels where needed
  - Verify keyboard navigation support

### Styling Best Practices
- **Avoid inline styling** in JSX like `style={{ padding: 20 }}`
- Inline styles are only acceptable for:
  - Dynamic styling based on state/props (e.g., `style={{ width: `${progress}%` }}`)
  - Conditional styling that changes based on logic
- Use CSS classes, styled-components, or CSS modules for static styling
- Put placeholders in all places where images or SVG are not yet available

### Code Organization Best Practices
- **File Size**: Keep files around 150 lines of code (can be slightly more or less) to improve readability
- **Component Refactoring**: When changing a file or component, consider if it can be refactored to split responsibilities and create reusable components
- **File Naming**: Rename components and files when changing their logic or content to give relevant context
- **Reusable Components**: Extract similar button variations, input fields with labels, card layouts, modals, loading states, alerts, and form field groups
- **Vanilla JavaScript Utilities**: Move pure JavaScript functions to `utils/` folder (functions that don't use React hooks or JSX)
- **Configuration Management**: API endpoints in `config/api.ts`, React Router paths in `config/routes.ts`, centralize environment-specific configs

### Testing Strategy
No formal testing framework is currently configured. When implementing tests:
- Consider adding Vitest for unit tests (already compatible with Vite)
- Test service layer functions independently
- Test custom hooks with React Testing Library
- Mock Chrome extension APIs for testing

### Git Workflow
- **Branch naming**: `feature/` prefix for feature branches (e.g., `feature/developers-menu`)
- **Main branch**: Production-ready code
- Commit messages should be descriptive and reference the feature/fix

## Domain Context

### Microsoft Dynamics 365
- **Forms**: UI layouts defined in systemform entities containing XML formxml definitions
- **Labels**: Stored in LocalizedLabels collections with LCID (Locale ID) keys
- **Entities**: Business data objects in D365 (Contact, Account, etc.)
- **Attributes**: Fields on entities with logical names and metadata
- **Web API**: RESTful OData v4.0 API for CRUD operations
  - Server-side pagination with `Prefer: odata.maxpagesize=N` header
  - `@odata.nextLink` for fetching subsequent pages
  - Filtering with `$filter` query parameter
  - Ordering with `$orderby` query parameter
- **Organization Context**: D365 instances (orgs) with base URLs like `https://*.dynamics.com`
- **Plugin Trace Logs**: Diagnostic logs capturing plugin execution details
  - **Correlation ID**: Unique identifier linking related operations in a transaction
  - **Type Code**: Categorizes log entries (e.g., ExecutionFailure, PerformanceWarning)
  - **Depth**: Nesting level of plugin execution (0 = root, 1+ = child operations)
  - **Message**: D365 message name that triggered the operation (Create, Update, etc.)
  - **Stage**: Pipeline stage where plugin executed (PreValidation, PreOperation, PostOperation)
  - **Performance Metrics**: Duration, CPU time, and resource usage for operations

### Language/Localization
- **LCID**: Microsoft's numeric language/locale identifiers (e.g., 1033 = English US, 1036 = French)
- **Provisioned Languages**: Languages enabled in a D365 organization
- **Base Language**: Default/primary language for the organization
- **LocalizedLabel**: D365 structure containing Label (text), LanguageCode (LCID), HasChanged, IsManaged

### Extension Architecture
- **Background Service Worker**: Handles Chrome extension lifecycle and permissions
- **Page Controller**: Content script injected into D365 pages for DOM manipulation
- **Relay**: Message broker between popup and content scripts
- **Storage Cache**: Chrome storage API for caching org context and settings

## Important Constraints

### Technical Constraints
- **Chrome Extension Manifest V3** requirements (service workers, limited background page capabilities)
- **Same-origin policy**: Must use host_permissions for `https://*.dynamics.com/*`
- **Content Security Policy**: Limited inline scripts and eval()
- **D365 Web API rate limits**: Throttling on rapid API calls
  - Batch requests should be split (recommended max 50 operations per batch)
  - Server-side pagination with configurable page sizes (default 100, max varies by entity)
- **FormXML structure**: Must parse and manipulate XML while preserving structure and relationships
- **Browser memory limits**: LRU cache strategies for managing large datasets (e.g., max 20 cached correlations)
- **Pending changes limits**: Maximum 200 pending translation changes to prevent performance degradation

### Business Constraints
- **Read-only for managed solutions**: Cannot edit labels in managed solution components
- **Security roles**: Users need appropriate D365 permissions to read/write metadata
- **Supported D365 versions**: Targets modern D365 (Power Platform) with Web API v4.0+

### Browser Constraints
- **Chrome/Edge only**: Extension built specifically for Chromium-based browsers
- **Active tab permissions**: Requires user to be on D365 tab to function

## External Dependencies

### Microsoft Dynamics 365 Web API
- **Endpoint**: `{orgUrl}/api/data/v9.2/`
- **Authentication**: Uses browser's existing D365 session (credentials: 'include')
- **Key endpoints**:
  - `systemforms`: Form metadata and definitions
  - `RetrieveFormXml`: Function to get detailed form XML
  - `SaveFormXml`: Action to update form definitions
  - `EntityDefinitions`: Entity metadata
  - `plugintracelogs`: Diagnostic logs

### Chrome Extension APIs
- **chrome.scripting**: Inject content scripts dynamically
- **chrome.tabs**: Query and interact with browser tabs
- **chrome.storage**: Persist user settings and cache
- **chrome.browsingData**: Clear cached data when needed

### Fluent UI Design System
- Design tokens and theming from @fluentui/react-components
- Icons from @fluentui/react-icons
- Responsive components following Microsoft design guidelines
- Panel component for side overlays (correlation flow viewer)

### React Flow
- Interactive node-based diagrams and flow visualizations
- Swimlane diagrams for correlation flow visualization
- Node and edge customization for displaying operation details
- Built-in zoom, pan, and interaction controls

### Build Tools
- **Vite**: Development server and production bundler
- **TypeScript compiler**: Type checking (noEmit mode, bundled by Vite)
- **React plugin**: JSX transformation and fast refresh
