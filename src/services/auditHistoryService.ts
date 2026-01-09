/**
 * Audit History Service
 * Handles fetching and parsing D365 audit history data
 */

import { fetchJson } from './d365Api';
import { buildApiUrl, buildAttributeUrl } from '../utils/urlBuilders';
import { pluralizeEntityName } from '../utils/entityNameUtils';
import type {
  AuditHistoryResponse,
  AuditDetail,
  ChangedField,
  ParsedAuditRecord,
  DisplayNamesMap,
  UserNamesMap,
} from '../types/audit';

/**
 * Retrieve audit history for a specific record using RetrieveRecordChangeHistory function
 */
export async function getAuditHistory(
  baseUrl: string,
  entityLogicalName: string,
  recordId: string,
  pageNumber: number = 1,
  pageSize: number = 50,
  apiVersion: string = 'v9.2'
): Promise<AuditHistoryResponse> {
  const api = buildApiUrl(baseUrl, apiVersion);

  // Build the function URL with parameters
  // Note: @odata.id requires the plural entity set name (e.g., "accounts", "contacts")
  const entitySetName = pluralizeEntityName(entityLogicalName);
  const target = encodeURIComponent(
    JSON.stringify({ '@odata.id': `${entitySetName}(${recordId})` })
  );

  const pagingInfo = encodeURIComponent(
    JSON.stringify({
      PageNumber: pageNumber,
      Count: pageSize,
      ReturnTotalRecordCount: true,
    })
  );

  const url = `${api}/RetrieveRecordChangeHistory(Target=@target,PagingInfo=@paginginfo)?@target=${target}&@paginginfo=${pagingInfo}`;

  try {
    const response = await fetchJson(url);
    return response as AuditHistoryResponse;
  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('403')) {
      throw new Error('Audit history is not available for this record. Auditing may not be enabled for this entity or you may not have permission to view audit data.');
    }
    throw error;
  }
}

/**
 * Parse an AuditDetail object to extract changed fields with old/new values
 */
export function parseAuditDetail(auditDetail: AuditDetail): ChangedField[] {
  const changedFields: ChangedField[] = [];

  const oldValue = auditDetail.OldValue || {};
  const newValue = auditDetail.NewValue || {};

  // Get all unique field names from both old and new values
  const fieldNames = new Set([
    ...Object.keys(oldValue),
    ...Object.keys(newValue),
  ]);

  // Exclude @odata.type field
  fieldNames.delete('@odata.type');

  for (const fieldName of fieldNames) {
    changedFields.push({
      fieldName,
      oldValue: oldValue[fieldName],
      newValue: newValue[fieldName],
    });
  }

  return changedFields;
}

/**
 * Parse audit history response into simplified records for UI consumption
 */
export function parseAuditHistory(response: AuditHistoryResponse): ParsedAuditRecord[] {
  const auditDetails = response.AuditDetailCollection.AuditDetails;

  return auditDetails.map((detail) => {
    const { AuditRecord } = detail;

    // Map operation code to string
    let operation: 'Create' | 'Update' | 'Delete' = 'Update';
    if (AuditRecord.operation === 1) operation = 'Create';
    else if (AuditRecord.operation === 3) operation = 'Delete';

    return {
      auditId: AuditRecord.auditid,
      createdOn: new Date(AuditRecord.createdon),
      operation,
      userId: AuditRecord._userid_value,
      changedFields: parseAuditDetail(detail),
    };
  });
}

/**
 * Fetch display names for a list of attributes
 * Used when the "Show Display Names" toggle is enabled
 */
export async function getAttributeDisplayNames(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalNames: string[],
  apiVersion: string = 'v9.2'
): Promise<DisplayNamesMap> {
  if (attributeLogicalNames.length === 0) {
    return {};
  }

  const displayNamesMap: DisplayNamesMap = {};

  // Fetch attributes in batches to avoid too many concurrent requests
  const batchSize = 10;
  for (let i = 0; i < attributeLogicalNames.length; i += batchSize) {
    const batch = attributeLogicalNames.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (attrName) => {
        try {
          const url = buildAttributeUrl({
            baseUrl,
            apiVersion,
            entityLogicalName,
            attributeLogicalName: attrName,
            select: ['LogicalName', 'DisplayName'],
          });

          const result = await fetchJson(url);

          // Extract display name from localized labels
          if (result.DisplayName?.LocalizedLabels?.[0]?.Label) {
            displayNamesMap[attrName] = result.DisplayName.LocalizedLabels[0].Label;
          } else {
            // Fallback to schema name if no display name
            displayNamesMap[attrName] = attrName;
          }
        } catch (error) {
          // If fetching fails for a specific attribute, use schema name
          console.warn(`Failed to fetch display name for ${attrName}:`, error);
          displayNamesMap[attrName] = attrName;
        }
      })
    );
  }

  return displayNamesMap;
}

/**
 * Fetch user full names for a list of user IDs
 * Used to display user names instead of just GUIDs
 */
export async function getUserNames(
  baseUrl: string,
  userIds: string[],
  apiVersion: string = 'v9.2'
): Promise<UserNamesMap> {
  if (userIds.length === 0) {
    return {};
  }

  const userNamesMap: UserNamesMap = {};
  const api = buildApiUrl(baseUrl, apiVersion);

  // Fetch users in batches to avoid too many concurrent requests
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (userId) => {
        try {
          const url = `${api}/systemusers(${userId})?$select=fullname`;
          const result = await fetchJson(url);

          if (result.fullname) {
            userNamesMap[userId] = result.fullname;
          } else {
            // Fallback to user ID if no full name
            userNamesMap[userId] = userId;
          }
        } catch (error) {
          // If fetching fails for a specific user, use user ID
          console.warn(`Failed to fetch user name for ${userId}:`, error);
          userNamesMap[userId] = userId;
        }
      })
    );
  }

  return userNamesMap;
}

/**
 * Format a value for display in the audit table
 */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    // Handle dates
    if (value instanceof Date) {
      return value.toLocaleString();
    }

    // Handle formatted values (e.g., @OData.Community.Display.V1.FormattedValue)
    if (typeof value === 'object' && value !== null && '@OData.Community.Display.V1.FormattedValue' in value) {
      return String((value as any)['@OData.Community.Display.V1.FormattedValue']);
    }

    // For complex objects, show JSON
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}
