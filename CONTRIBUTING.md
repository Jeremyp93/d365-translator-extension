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

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes following the guidelines above
4. Test your changes thoroughly
5. Submit a pull request

## Questions?

If you have questions about contributing, please open an issue for discussion.
