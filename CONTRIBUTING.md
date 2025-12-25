# Contributing to D365 Translator Extension

Thank you for your interest in contributing to the D365 Translator Extension!

## Development Guidelines

### Code Standards

#### URL Building for Dynamics 365 Web API

**Always use the `urlBuilders` utility for constructing Dynamics 365 Web API URLs.**

Located at [src/utils/urlBuilders.ts](src/utils/urlBuilders.ts), this utility provides standardized functions for building D365 API endpoints with proper encoding and OData conventions.

**Available Builders:**

- `buildApiUrl(baseUrl, apiVersion)` - Base API URL
- `buildEntityDefinitionUrl(options)` - Entity metadata endpoints
- `buildAttributeUrl(options)` - Attribute metadata endpoints
- `buildFormUrl(options)` - Form (systemform) endpoints
- `buildGlobalOptionSetUrl(options)` - Global option set endpoints
- `buildUserSettingsUrl(options)` - User settings endpoints
- `buildBatchUrl(baseUrl, apiVersion)` - Batch request endpoint
- `buildActionUrl(options)` - D365 actions (PublishXml, WhoAmI, etc.)
- `buildRelativeAttributeUrl(options)` - Relative URLs for batch operations
- `buildODataQuery(options)` - OData query string builder

**Example - Before:**
```typescript
// ❌ Don't do this
const url = `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityName)}')/Attributes(LogicalName='${encodeURIComponent(attrName)}')?$select=DisplayName`;
```

**Example - After:**
```typescript
// ✅ Do this instead
import { buildAttributeUrl } from '../utils/urlBuilders';

const url = buildAttributeUrl({
  baseUrl,
  apiVersion,
  entityLogicalName: entityName,
  attributeLogicalName: attrName,
  select: ['DisplayName']
});
```

**Benefits:**
- Eliminates URL construction duplication
- Ensures proper URI encoding
- Handles OData conventions correctly
- Improves code maintainability
- Provides type safety with TypeScript interfaces

### API Version Constants

Use the `D365_API_VERSION` constant from [src/config/constants.ts](src/config/constants.ts) instead of hard-coding version strings:

```typescript
import { D365_API_VERSION } from '../config/constants';

// The urlBuilders use this constant by default
const url = buildApiUrl(baseUrl, D365_API_VERSION);
```

## Development Workflow

### Feature Branch Workflow

This repository uses a protected main branch. All changes must go through pull requests.

#### 1. Create Feature Branch

Start from the latest main branch:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

Use the `feature/` prefix for feature branches (e.g., `feature/add-export-button`, `feature/fix-translation-bug`).

#### 2. Make Changes

- Follow the code standards documented above
- Make regular commits with clear, descriptive messages
- Test your changes thoroughly in Chrome with the extension loaded

#### 3. Push Your Branch

```bash
git add .
git commit -m "Clear description of changes"
git push origin feature/your-feature-name
```

#### 4. Create Pull Request

1. Go to the repository on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out the PR template (it will auto-populate)
5. Submit the PR

**Automated checks will run**:
- ✅ **CI Build** - Verifies TypeScript compilation and build success
- ✅ **CodeRabbit Review** - AI-powered code review with suggestions
- ✅ **Claude Code Auto Review** - Automatic review using CODE_REVIEW.md guidelines
- ✅ **Artifact Generation** - Creates downloadable Chrome extension zip

#### 5. Address Review Feedback

- Review comments from AI reviewers (CodeRabbit and Claude Code)
- Address any concerns or questions
- Push additional commits to your branch (CI will re-run automatically)
- You can ask questions to the AI reviewers in PR comments

#### 6. Merge

Once all checks pass and the PR is approved:
- Click "Squash and merge" or "Merge pull request"
- Delete your feature branch after merging
- Pull the latest main branch:

```bash
git checkout main
git pull origin main
```

### Testing Your Changes

Before submitting a PR, ensure:

1. **Build succeeds**: `npm run build`
2. **TypeScript check passes**: `npx tsc --noEmit`
3. **Extension loads in Chrome**:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder
4. **No console errors**: Check browser console for errors
5. **Functionality works**: Test the specific features you changed in a Dynamics 365 environment

### CI/CD Pipeline

The repository uses GitHub Actions for continuous integration:

- **Triggers**: Pull requests to main, pushes to main
- **Steps**:
  1. Checkout code
  2. Install dependencies
  3. TypeScript type checking
  4. Build extension
  5. Create distributable zip artifact
  6. Upload artifact (available for 30 days)

You can download the built extension artifact from the "Actions" tab → select your workflow run → "Artifacts" section.

### Creating Releases

The repository includes an on-demand release workflow that creates GitHub releases with downloadable extension zips.

**To create a release:**

1. Go to **Actions** tab → **Create Release** workflow
2. Click **Run workflow**
3. Choose options:
   - **version**: Leave empty to use version from manifest.json, or specify custom version (e.g., `1.2.0`)
   - **prerelease**: Check this for beta/preview releases
4. Click **Run workflow**

The workflow will:
- Build the extension
- Create a properly formatted zip file (single zip, not nested)
- Create a GitHub release with auto-generated release notes
- Attach the zip file to the release

**Version Management:**
- Version is controlled by `public/manifest.json` → `version` field
- Update the manifest version before creating a release
- Use semantic versioning (e.g., `1.0.0`, `1.1.0`, `2.0.0`)

**Finding Releases:**
- Go to the repository homepage → **Releases** section (right sidebar)
- Or navigate to: `https://github.com/[owner]/d365-translator-extension/releases`

### AI Code Reviews

Three AI review mechanisms are configured for all PRs:

#### 1. CodeRabbit (Automatic)
- Reviews code quality, best practices, potential bugs
- Configured in [.github/coderabbit.yaml](.github/coderabbit.yaml)
- Focus areas: TypeScript, React patterns, Chrome API usage, security
- **Triggers automatically** when PR is opened/updated

#### 2. Claude Code Auto Review (Automatic)
- Comprehensive review using [CODE_REVIEW.md](CODE_REVIEW.md) checklist
- Configured in [.github/workflows/claude-auto-review.yml](.github/workflows/claude-auto-review.yml)
- **Triggers automatically** when PR is opened/updated
- Reviews all 18 checklist items including:
  - Naming conventions, TypeScript best practices
  - Custom hooks extraction, reusable components
  - Accessibility, security, performance
  - Service layer separation, file organization
- Provides detailed feedback with ❌/✅ code examples

#### 3. Claude Code On-Demand (Manual)
- Interactive AI assistant for follow-up questions
- Configured in [.github/workflows/claude-code-review.yml](.github/workflows/claude-code-review.yml)
- **Trigger**: Mention `@claude` in any PR comment
- **Use cases**:
  - Ask specific questions: `@claude how can I improve the performance of this function?`
  - Request alternative approaches: `@claude suggest a better pattern for this implementation`
  - Clarify review feedback: `@claude can you explain why custom hooks are better here?`
  - Get help: `@claude how should I structure this service?`

**Review Workflow:**
1. Open PR → CodeRabbit and Claude Auto Review post feedback automatically
2. Review the feedback from both AI reviewers
3. Make changes based on suggestions
4. Ask follow-up questions by mentioning `@claude` in comments
5. Push updates → reviews run again automatically

## Submitting Changes

Follow the Feature Branch Workflow above. Key points:

1. Create feature branch from main
2. Make changes following code standards
3. Test thoroughly
4. Push and create PR
5. Address AI review feedback
6. Merge after approval and passing checks

## Questions?

If you have questions about contributing, please open an issue for discussion.
