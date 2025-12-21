const DEFAULT_API_VERSION = 'v9.2';

/**
 * URL builders for D365 Web API endpoints
 * All URLs are properly encoded and follow OData conventions
 */

export interface UrlBuilderOptions {
  baseUrl: string;
  apiVersion?: string;
}

/**
 * Build base API URL
 */
export function buildApiUrl(baseUrl: string, apiVersion: string = DEFAULT_API_VERSION): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  return `${trimmedBase}/api/data/${apiVersion}`;
}

/**
 * Build entity definition URL
 */
export function buildEntityDefinitionUrl(
  options: UrlBuilderOptions & {
    entityLogicalName: string;
    select?: string[];
    expand?: string;
  }
): string {
  const { baseUrl, apiVersion = DEFAULT_API_VERSION, entityLogicalName, select, expand } = options;
  const api = buildApiUrl(baseUrl, apiVersion);
  const encoded = encodeURIComponent(entityLogicalName);
  let url = `${api}/EntityDefinitions(LogicalName='${encoded}')`;

  const queryParts: string[] = [];
  if (select?.length) {
    queryParts.push(`$select=${select.join(',')}`);
  }
  if (expand) {
    queryParts.push(`$expand=${expand}`);
  }

  return queryParts.length > 0 ? `${url}?${queryParts.join('&')}` : url;
}

/**
 * Build attribute definition URL
 */
export function buildAttributeUrl(
  options: UrlBuilderOptions & {
    entityLogicalName: string;
    attributeLogicalName: string;
    select?: string[];
    expand?: string;
    castType?: string; // e.g., 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata'
  }
): string {
  const {
    baseUrl,
    apiVersion = DEFAULT_API_VERSION,
    entityLogicalName,
    attributeLogicalName,
    select,
    expand,
    castType,
  } = options;

  const api = buildApiUrl(baseUrl, apiVersion);
  const encodedEntity = encodeURIComponent(entityLogicalName);
  const encodedAttr = encodeURIComponent(attributeLogicalName);

  let url = `${api}/EntityDefinitions(LogicalName='${encodedEntity}')/Attributes(LogicalName='${encodedAttr}')`;

  if (castType) {
    url += `/${castType}`;
  }

  const queryParts: string[] = [];
  if (select?.length) {
    queryParts.push(`$select=${select.join(',')}`);
  }
  if (expand) {
    queryParts.push(`$expand=${expand}`);
  }

  return queryParts.length > 0 ? `${url}?${queryParts.join('&')}` : url;
}

/**
 * Build form (systemform) URL
 */
export function buildFormUrl(
  options: UrlBuilderOptions & {
    formId: string;
    select?: string[];
  }
): string {
  const { baseUrl, apiVersion = DEFAULT_API_VERSION, formId, select } = options;
  const api = buildApiUrl(baseUrl, apiVersion);
  const guid = formId.replace(/[{}]/g, '').toLowerCase();
  let url = `${api}/systemforms(${guid})`;

  if (select?.length) {
    url += `?$select=${select.join(',')}`;
  }

  return url;
}

/**
 * Build global option set URL
 */
export function buildGlobalOptionSetUrl(
  options: UrlBuilderOptions & {
    optionSetName: string;
    select?: string[];
    castType?: string;
  }
): string {
  const { baseUrl, apiVersion = DEFAULT_API_VERSION, optionSetName, select, castType } = options;
  const api = buildApiUrl(baseUrl, apiVersion);
  const encoded = encodeURIComponent(optionSetName);

  let url = `${api}/GlobalOptionSetDefinitions(Name='${encoded}')`;

  if (castType) {
    url += `/${castType}`;
  }

  const queryParts: string[] = [];
  if (select?.length) {
    queryParts.push(`$select=${select.join(',')}`);
  }

  return queryParts.length > 0 ? `${url}?${queryParts.join('&')}` : url;
}

/**
 * Build user settings URL
 */
export function buildUserSettingsUrl(
  options: UrlBuilderOptions & {
    systemUserId: string;
    select?: string[];
  }
): string {
  const { baseUrl, apiVersion = DEFAULT_API_VERSION, systemUserId, select } = options;
  const api = buildApiUrl(baseUrl, apiVersion);
  const guid = systemUserId.replace(/[{}]/g, '').toLowerCase();
  let url = `${api}/usersettingscollection(${guid})`;

  if (select?.length) {
    url += `?$select=${select.join(',')}`;
  }

  return url;
}

/**
 * Build batch endpoint URL
 */
export function buildBatchUrl(baseUrl: string, apiVersion: string = DEFAULT_API_VERSION): string {
  const api = buildApiUrl(baseUrl, apiVersion);
  return `${api}/$batch`;
}

/**
 * Build action URL (for D365 actions like PublishXml, WhoAmI, etc.)
 */
export function buildActionUrl(
  options: UrlBuilderOptions & {
    actionName: string;
    parameters?: Record<string, unknown>;
  }
): string {
  const { baseUrl, apiVersion = DEFAULT_API_VERSION, actionName, parameters } = options;
  const api = buildApiUrl(baseUrl, apiVersion);
  let url = `${api}/${actionName}`;

  if (parameters) {
    const params = Object.entries(parameters)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join(',');
    url += `(${params})`;
  } else {
    url += '()';
  }

  return url;
}

/**
 * Build OData query string from filters, select, orderby, etc.
 */
export interface ODataQueryOptions {
  select?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  expand?: string;
}

export function buildODataQuery(options: ODataQueryOptions): string {
  const parts: string[] = [];

  if (options.select?.length) {
    parts.push(`$select=${options.select.join(',')}`);
  }

  if (options.filter) {
    parts.push(`$filter=${options.filter}`);
  }

  if (options.orderby) {
    parts.push(`$orderby=${options.orderby}`);
  }

  if (options.top !== undefined) {
    parts.push(`$top=${options.top}`);
  }

  if (options.skip !== undefined) {
    parts.push(`$skip=${options.skip}`);
  }

  if (options.expand) {
    parts.push(`$expand=${options.expand}`);
  }

  return parts.join('&');
}
