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
- ✅ **Claude Code Review** - Additional AI review focused on best practices
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

### AI Code Reviews

Two AI reviewers will automatically review your PRs:

#### CodeRabbit
- Reviews code quality, best practices, potential bugs
- Configured in [.github/coderabbit.yaml](.github/coderabbit.yaml)
- Focus areas: TypeScript, React patterns, Chrome API usage, security

#### Claude Code
- On-demand AI assistant for code reviews and questions
- Configured in [.github/workflows/claude-code-review.yml](.github/workflows/claude-code-review.yml)
- **Trigger**: Mention `@claude` in any PR comment or review comment
- Can answer questions, review code, suggest improvements, and reference project documentation

**How to use**:
- Comment on a PR with `@claude review this PR` for a full review
- Ask specific questions: `@claude how can I improve the performance of this function?`
- Request help: `@claude suggest a better approach for this implementation`

CodeRabbit will automatically review PRs, while Claude Code responds to your `@claude` mentions.

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
