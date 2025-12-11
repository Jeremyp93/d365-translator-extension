# Project Context

## Purpose
D365 Toolkit is a Chrome browser extension that provides multiple productivity tools for Microsoft Dynamics 365 administrators and developers. The extension features a modular menu system with different toolsets:

### Translation Tools
- Highlight fields on a Dynamics 365 form and view their display-name translations in all provisioned languages
- Edit and save form field labels across multiple languages (LCIDs) through an intuitive UI
- View comprehensive field and form reports with translation status
- Export/import translations for offline editing

### Developer Tools
- Monitor and review plugin trace logs for troubleshooting
- (Additional developer utilities in development)

### Future Expansion
The architecture is designed to accommodate additional D365 toolsets as new use cases emerge, maintaining a unified extension experience while keeping features modular and organized.

The primary goal is to streamline common D365 administrative and development workflows, reducing the need to navigate through multiple Power Platform interfaces for routine tasks.

## Tech Stack
- **TypeScript** (strict mode enabled)
- **React 18** with React Router for SPA navigation
- **Fluent UI v9** (@fluentui/react-components) for consistent Microsoft design system
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

### Architecture Patterns
- **Service Layer Pattern**: Business logic isolated in `/services` directory (d365Api.ts, formLabelService.ts, entityLabelService.ts, etc.)
- **Custom Hooks Pattern**: React state management abstracted into hooks in `/hooks` directory (useFormLabels.ts, useLanguages.ts, etc.)
- **Component Composition**: UI components in `/components` with reusable primitives in `/components/ui`
- **Content Script Architecture**: Uses relay pattern for Chrome extension message passing between popup, content scripts, and background worker
- **Context API**: Theme management via React Context (ThemeContext.tsx)
- **Path Aliases**: Vite configured with aliases (@, @services, @hooks, @ui, @pages, @components, @report)
- **Responsive Design**: Report pages are designed to be responsive and work across different screen sizes, adapting layouts for desktop and mobile viewing
- **Separation of Concerns**: 
  - `/popup`: Extension popup UI (fixed width for consistent extension UX)
  - `/report`: Separate SPA for comprehensive reporting (responsive, full-page views)
  - `/controller`: Page manipulation logic
  - `/relay`: Message passing between extension contexts
  - `/background`: Service worker for Chrome extension

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
- **Organization Context**: D365 instances (orgs) with base URLs like `https://*.dynamics.com`

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
- **FormXML structure**: Must parse and manipulate XML while preserving structure and relationships

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

### Build Tools
- **Vite**: Development server and production bundler
- **TypeScript compiler**: Type checking (noEmit mode, bundled by Vite)
- **React plugin**: JSX transformation and fast refresh
