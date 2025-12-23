# D365 Translation Manager

A Chrome extension for managing multilingual translations in Microsoft Dynamics 365. Streamline your translation workflow with powerful tools for editing entity labels, form structures, option sets, and more.

## Features

### Translation Management
- **Entity Browser** - Browse all entities and attributes with bulk translation editing
- **Field Editor** - Edit individual field labels across all provisioned languages
- **Form Translations** - Visual form structure editor with tree view of tabs, sections, and controls
- **Global OptionSets** - Manage global option set labels and track field dependencies
- **Batch Operations** - Cart system for pending changes with bulk save functionality

### Developer Tools
- **Plugin Trace Logs** - View and analyze plugin execution traces with filtering
- **Correlation Flow Visualization** - Interactive flow diagram showing plugin execution relationships
- **Field Highlighter** - Highlight translatable fields directly on D365 forms
- **Cache Management** - Clear cache and hard refresh with one click

## Pages Overview

### Popup (Extension Icon)
The extension popup provides quick access to all features through two tabs:

**General Tab:**
- Show/Hide All Fields - Highlights all translatable fields on the current form
- Form Translations - Opens the form structure editor
- Global OptionSets - Manage global option set labels
- Entity Browser - Browse all entities and attributes

**Developer Tab:**
- Clear Cache & Refresh - Clears browser cache and refreshes the page
- Plugin Trace Logs - Opens the trace log viewer

### Report Pages

#### 1. Entity Attribute Browser
Browse and edit translations for all entities and attributes in your D365 environment.

**Features:**
- Entity sidebar with search and filtering
- Attribute data grid with multi-column sorting
- Bulk translation editor with cart system
- Dependency panel showing form/view usage
- Batch save across multiple entities

**Path:** [src/report/pages/EntityAttributeBrowserPage.tsx](src/report/pages/EntityAttributeBrowserPage.tsx)

#### 2. Field Report
Edit translations for individual entity fields including display names, descriptions, and option sets.

**Features:**
- Entity field labels across all languages
- Form control labels
- OptionSet translations (local option sets)
- Direct save and publish

**Path:** [src/report/pages/FieldReportPage.tsx](src/report/pages/FieldReportPage.tsx)

#### 3. Form Structure Editor
Comprehensive form structure viewer and translation editor.

**Features:**
- Tree view of complete form structure (header, tabs, sections, controls, footer)
- Side-by-side panel layout
- Edit labels for tabs, sections, and controls across all languages
- Search and filter functionality
- Expand/collapse all controls
- Raw XML viewer for debugging
- Save and publish form changes

**Path:** [src/report/pages/FormReportPage.tsx](src/report/pages/FormReportPage.tsx)

#### 4. Global OptionSet Manager
Manage global option sets and their translations.

**Features:**
- List all global option sets in the environment
- Edit option labels across all provisioned languages
- View which fields use each option set
- Auto-publish on save

**Path:** [src/report/pages/GlobalOptionSetPage.tsx](src/report/pages/GlobalOptionSetPage.tsx)

#### 5. Plugin Trace Log Viewer
View and analyze plugin execution traces with advanced filtering and visualization.

**Features:**
- Server-side filtering (type, message, operation depth, date range)
- Quick client-side search
- Sortable table with expandable rows
- Correlation flow visualization using interactive diagrams
- Infinite scroll support
- Exception and detailed trace log viewing

**Path:** [src/report/pages/PluginTraceLogPage.tsx](src/report/pages/PluginTraceLogPage.tsx)

## Technology Stack

- **React 18** with TypeScript
- **Vite** - Build tooling and development server
- **Fluent UI** (@fluentui/react-components) - Microsoft design system
- **React Router** - Navigation between report pages
- **ReactFlow** - Plugin trace log visualization
- **Chrome Extension API** (Manifest V3)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements (Button, Section, PageHeader, Notice)
│   ├── entity-browser/ # Entity browser specific components
│   ├── form-structure/ # Form structure specific components
│   ├── global-optionset/ # Global option set components
│   └── plugin-trace/   # Plugin trace log components
├── context/            # React contexts (Theme, PendingChanges)
├── controller/         # Page controller (content script)
├── hooks/              # Custom React hooks (14+ hooks)
├── popup/              # Extension popup UI
├── report/             # Full-screen report pages
├── services/           # API services and business logic
│   ├── d365Api.ts              # Core D365 Web API
│   ├── entityLabelService.ts  # Entity/attribute labels
│   ├── formLabelService.ts    # Form control labels
│   ├── formStructureService.ts # Form XML parsing
│   ├── optionSetService.ts    # Option sets
│   ├── pluginTraceLogService.ts # Plugin traces
│   └── dependencyService.ts   # Dependencies
├── styles/             # Theming and global styles
├── types/              # TypeScript type definitions
└── utils/              # Utility functions (URL builders, helpers)
```

## Installation

### Development Build

1. Clone the repository:
```bash
git clone <repository-url>
cd d365-translator-extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from the project

### Development Mode

Run the development server with hot reload:
```bash
npm run dev
```

## Usage

1. **Navigate to your Dynamics 365 environment** (e.g., `https://yourorg.crm.dynamics.com`)

2. **Click the extension icon** in your Chrome toolbar to open the popup

3. **Choose an action:**
   - Click "Entity Browser" to browse and edit entity/attribute labels
   - Click "Form Translations" to edit form structure labels
   - Click "Global OptionSets" to manage option set translations
   - Click "Show All Fields" to highlight translatable fields on the current form
   - Click "Plugin Trace Logs" to view and analyze plugin executions

4. **Make your changes** in the report pages

5. **Save** your translations - changes are automatically published to D365

## Permissions

The extension requires the following permissions:

- `scripting` - Inject content scripts to highlight fields
- `activeTab` - Access the current D365 tab
- `tabs` - Manage tabs for report pages
- `browsingData` - Clear cache functionality
- `storage` - Store extension settings
- Host permissions: `https://*.dynamics.com/*` - Access D365 Web API

## Key Features in Detail

### Bulk Translation Management
The Entity Browser includes a cart system that allows you to:
- Select multiple attributes across different entities
- Edit translations for all selected fields at once
- Review pending changes before saving
- Batch save all changes in a single operation

### Form Structure Parsing
The Form Structure Editor parses the complete form XML for all provisioned languages and provides:
- Visual tree representation of form hierarchy
- Inline editing of labels
- Search and filter capabilities
- Raw XML viewer for debugging

### Dependency Tracking
The extension tracks where attributes and option sets are used:
- Shows which forms and views use each attribute
- Displays which fields reference each global option set
- Helps identify translation impact

### Plugin Trace Visualization
The Plugin Trace Log viewer provides:
- Advanced filtering by type, message, operation depth, and date
- Interactive correlation flow diagrams showing parent-child plugin relationships
- Detailed exception and trace log viewing
- Infinite scroll for large datasets

## Development

### Build Commands

```bash
npm run dev          # Development mode with hot reload
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Code Quality

- TypeScript with strict mode enabled
- Component-based architecture
- Custom hooks for reusable logic
- Comprehensive error handling
- URL builder standards (see [CONTRIBUTING.md](CONTRIBUTING.md))

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

Key guidelines:
- Use standardized URL builders from [src/utils/urlBuilders.ts](src/utils/urlBuilders.ts)
- Follow the code review checklist
- Maintain TypeScript strict mode compliance

## License

[Your License Here]

## Support

For issues and questions:
- Open an issue in the GitHub repository
- Check existing issues for similar problems
- Include D365 version and browser information when reporting bugs

## Version

Current version: 1.0.0

## Acknowledgments

- Built with [Fluent UI](https://react.fluentui.dev/) for Microsoft-consistent design
- Uses [ReactFlow](https://reactflow.dev/) for visualization
- Powered by the [Dynamics 365 Web API](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)
