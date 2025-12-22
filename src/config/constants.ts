/**
 * D365 API Configuration Constants
 */

// API Versions
export const D365_API_VERSION = 'v9.2' as const;
export const DEFAULT_API_VERSION = D365_API_VERSION;

// Default Language (LCID)
// Note: For comprehensive language code mappings, see utils/languageNames.ts
export const DEFAULT_BASE_LANGUAGE = 1033; // English (United States)

// Cache TTL (Time To Live)
export const CACHE_TTL = {
  PROVISIONED_LANGUAGES: 6 * 60 * 60 * 1000, // 6 hours
  METADATA: 30 * 60 * 1000, // 30 minutes
  SHORT: 5 * 60 * 1000, // 5 minutes
} as const;

// Form Types
export const FORM_TYPE = {
  MAIN: 2,
  QUICK_CREATE: 6,
  QUICK_VIEW: 7,
  CARD: 11,
  MAIN_INTERACTIVE: 12,
} as const;

export const SUPPORTED_FORM_TYPES = [
  FORM_TYPE.MAIN,
  FORM_TYPE.QUICK_CREATE,
  FORM_TYPE.QUICK_VIEW,
  FORM_TYPE.CARD,
  FORM_TYPE.MAIN_INTERACTIVE,
] as const;

// Attribute Types
export const ATTRIBUTE_TYPE = {
  STRING: 'String',
  PICKLIST: 'Picklist',
  MULTI_SELECT_PICKLIST: 'MultiSelectPicklist',
  BOOLEAN: 'Boolean',
  STATE: 'State',
  STATUS: 'Status',
  INTEGER: 'Integer',
  DECIMAL: 'Decimal',
  MONEY: 'Money',
  DATETIME: 'DateTime',
  LOOKUP: 'Lookup',
  MEMO: 'Memo',
} as const;

// Component Types (for dependencies)
export const COMPONENT_TYPE = {
  ENTITY: 1,
  ATTRIBUTE: 2,
  OPTION_SET: 9,
  FORM: 24,
  VIEW: 26,
  SYSTEM_FORM: 60,
} as const;

// Operation Modes
export const OPERATION_MODE = {
  SYNCHRONOUS: 0,
  ASYNCHRONOUS: 1,
} as const;

// Plugin Operation Types
export const PLUGIN_OPERATION_TYPE = {
  PLUGIN: 0,
  WORKFLOW: 1,
  CUSTOM_ACTION: 2,
} as const;

// Performance Thresholds (milliseconds)
export const PERFORMANCE_THRESHOLD = {
  FAST: 1000,
  MODERATE: 5000,
  SLOW: 10000,
} as const;

// Batch Request Settings
export const BATCH = {
  MAX_OPERATIONS: 1000,
  DEFAULT_PAGE_SIZE: 100,
} as const;

// HTTP Request Settings
export const HTTP = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;
