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
1. src/components/entity-browser/AttributeDependenciesPanel.tsx
Status: Entire file commented out (lines 1-220)
Recommendation: Delete file or uncomment if planning to use
1. src/components/entity-browser/EntitySelector.tsx
Status: Entire file commented out (lines 1-150)
Recommendation: Delete file or uncomment if planning to use
UTILS - Unused Exports (13 total)

1. src/utils/urlBuilders.ts (9 unused - ENTIRE MODULE)
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