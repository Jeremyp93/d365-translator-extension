Summary of Unused Code
Total: 25 unused functions/constants + 2 completely commented-out files
By Category:
Services: 6 unused functions
Components: 2 commented-out files
Utils: 13 unused functions/constants
Hooks: 1 completely unused hook
Highest Impact Items to Remove:
Complete Files (Safe to Delete):
src/utils/urlBuilders.ts - Entire file with 9 functions + 2 interfaces, zero usage
src/hooks/useFormLabels.ts - Complete unused hook with 3 exports
src/components/entity-browser/AttributeDependenciesPanel.tsx - Already commented out
src/components/entity-browser/EntitySelector.tsx - Already commented out
Individual Functions: 5. languageService.ts - 3 cache management functions 6. optionSetService.ts - 1 redundant function 7. pluginTraceLogService.ts - 1 single-fetch function 8. storageCache.ts - 1 clear-all function 9. languageNames.ts - 3 helper functions 10. controlClassIds.ts - 1 constant (may be data source for other functions) The complete detailed report with line numbers and recommendations is in the plan file. Would you like me to proceed with removing this unused code?
Claude’s Plan
Unused Code Analysis Report
Summary
Total Unused Exports Found: 25 functions/constants + 2 entire files
Breakdown by Category:
Services: 6 unused functions
Components: 2 completely commented-out files
Utils: 13 unused functions/constants
Hooks: 1 completely unused hook (3 exports)
SERVICES - Unused Functions (6 total)
1. languageService.ts (3 unused)
warmProvisionedLanguagesCache() (line 29)
Purpose: Proactively warm the cache for provisioned languages
Recommendation: Remove unless planning future preloading optimization
clearProvisionedLanguagesCache() (line 34)
Purpose: Clear cached provisioned languages
Recommendation: Remove or integrate into cache management system
getLanguagesBundle() (line 39)
Purpose: Returns both languages and base LCID together
Recommendation: Remove if bundling pattern isn't needed
2. storageCache.ts (1 unused)
storageClearAll() (line 56)
Purpose: Clear all storage for a specific base URL
Recommendation: Remove unless needed for debugging/testing
3. optionSetService.ts (1 unused)
getOptionSetOptions() (line 167)
Purpose: Fetch option set options
Note: Redundant - getOptionSetMetadata() provides the same data
Recommendation: Safe to remove
4. pluginTraceLogService.ts (1 unused)
getPluginTraceLogById() (line 135)
Purpose: Fetch a single plugin trace log by ID
Recommendation: Remove if single log fetching isn't needed
COMPONENTS - Unused Files (2 total)
1. src/components/entity-browser/AttributeDependenciesPanel.tsx
Status: Entire file commented out (lines 1-220)
Recommendation: Delete file or uncomment if planning to use
2. src/components/entity-browser/EntitySelector.tsx
Status: Entire file commented out (lines 1-150)
Recommendation: Delete file or uncomment if planning to use
UTILS - Unused Exports (13 total)
1. src/utils/controlClassIds.ts (1 unused)
controlClassIds (constant Record)
Purpose: Maps GUID to control type names
Note: getControlTypeName() and isEditableControlType() from same file ARE used
Recommendation: Keep if it's the data source for the used functions, otherwise remove
2. src/utils/languageNames.ts (3 unused)
getLanguageDisplayName()
Purpose: Formats language code with LCID
getLanguageName()
Purpose: Gets language name without LCID
CommonLanguageCodes (object)
Purpose: Common LCID constants
Note: languageNames constant from same file IS used
Recommendation: Remove unused functions, keep languageNames constant
3. src/utils/urlBuilders.ts (9 unused - ENTIRE MODULE)
buildApiUrl()
buildEntityDefinitionUrl()
buildAttributeUrl()
buildFormUrl()
buildGlobalOptionSetUrl()
buildUserSettingsUrl()
buildBatchUrl()
buildActionUrl()
buildODataQuery()
Plus interfaces: UrlBuilderOptions, ODataQueryOptions
Status: Complete module with no usage anywhere
Recommendation: Delete entire file or mark as deprecated if keeping for future use
HOOKS - Unused Hook (1 complete hook)
1. src/hooks/useFormLabels.ts (ENTIRE HOOK UNUSED)
useFormLabels() hook
UseFormLabelsState interface
UseFormLabelsApi interface
Purpose: Appears to be for form label editing
Note: Likely replaced by other label editing mechanisms
Recommendation: Delete file if deprecated, or investigate why it's not being used
Cleanup Recommendations
High Priority (Safe to Delete)
src/utils/urlBuilders.ts - Entire unused file
src/hooks/useFormLabels.ts - Entire unused hook
src/components/entity-browser/AttributeDependenciesPanel.tsx - Already commented out
src/components/entity-browser/EntitySelector.tsx - Already commented out
Medium Priority (Review Before Deleting)
optionSetService.ts: getOptionSetOptions() - Redundant function
pluginTraceLogService.ts: getPluginTraceLogById() - May be needed later
languageNames.ts: Remove 3 unused helper functions, keep languageNames constant
Low Priority (Keep or Document)
languageService.ts: Cache management functions - May be useful for optimization
storageCache.ts: storageClearAll() - Useful for debugging
controlClassIds.ts: controlClassIds constant - May be data source for other functions
Estimated Impact
Lines of Code to Remove: ~500-600 lines Files to Delete: 4 complete files Functions to Remove: ~20 individual functions This cleanup would:
Reduce bundle size
Improve code maintainability
Remove confusion about which APIs to use
Make the codebase easier to navigate