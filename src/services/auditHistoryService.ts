/**
 * Audit History Service
 * Handles fetching and parsing D365 audit history data
 */

import { fetchJson } from './d365Api';
import { buildApiUrl, buildAttributeUrl } from '../utils/urlBuilders';
import { pluralizeEntityName } from '../utils/entityNameUtils';
import { AUDIT_ACTION, AUDIT_OPERATION } from '../types/auditEnums';
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

  // Handle ShareAuditDetail (actions 14, 48, 49: Share, Modify Share, Unshare)
  if (auditDetail['@odata.type'] === '#Microsoft.Dynamics.CRM.ShareAuditDetail') {
    const shareDetail = auditDetail as any;
    const principalId = shareDetail.Principal?.ownerid;
    
    changedFields.push({
      fieldName: 'Access Privileges',
      displayName: 'Access Privileges',
      oldValue: shareDetail.OldPrivileges || 'None',
      newValue: shareDetail.NewPrivileges || 'None',
      principalId,
    });
    return changedFields;
  }

  // Handle RelationshipAuditDetail (actions 33 & 34: Associate/Disassociate)
  if (auditDetail['@odata.type'] === '#Microsoft.Dynamics.CRM.RelationshipAuditDetail') {
    const relDetail = auditDetail as any;
    const action = relDetail.AuditRecord.action;
    const isAssociate = action === 33 || action === 35; // Associate Entities or Add Members
    
    changedFields.push({
      fieldName: 'Relationship',
      displayName: relDetail.RelationshipName || 'Relationship',
      oldValue: isAssociate ? null : (relDetail.TargetRecords || []),
      newValue: isAssociate ? (relDetail.TargetRecords || []) : null,
      relationshipName: relDetail.RelationshipName,
      targetRecords: relDetail.TargetRecords || [],
    });
    return changedFields;
  }

  // Handle AttributeAuditDetail (standard field changes)
  const attrDetail = auditDetail as any;
  const oldValue = attrDetail.OldValue || {};
  const newValue = attrDetail.NewValue || {};

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

    // Prefer action field over operation for display (action is more specific)
    // Fallback to operation if action is not available or unknown
    let operation: string;
    if (AuditRecord.action !== undefined && AuditRecord.action in AUDIT_ACTION) {
      operation = AUDIT_ACTION[AuditRecord.action];
    } else if (AuditRecord.operation in AUDIT_OPERATION) {
      operation = AUDIT_OPERATION[AuditRecord.operation];
    } else {
      // Final fallback
      operation = `Unknown (Action: ${AuditRecord.action}, Operation: ${AuditRecord.operation})`;
    }

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
 * Normalize lookup field names from OData format
 * Example: _msdyn_resourcerequirement_value -> msdyn_resourcerequirement
 */
export function normalizeLookupFieldName(fieldName: string): string {
  if (fieldName.startsWith('_') && fieldName.endsWith('_value')) {
    return fieldName.slice(1, -6);
  }
  return fieldName;
}

/**
 * Check if a field name is a lookup field based on OData naming convention
 */
export function isLookupField(fieldName: string): boolean {
  return fieldName.startsWith('_') && fieldName.endsWith('_value');
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
          // Normalize lookup field names before fetching metadata
          const normalizedName = normalizeLookupFieldName(attrName);

          const url = buildAttributeUrl({
            baseUrl,
            apiVersion,
            entityLogicalName,
            attributeLogicalName: normalizedName,
            select: ['LogicalName', 'DisplayName'],
          });

          const result = await fetchJson(url);

          // Extract display name from localized labels
          if (result.DisplayName?.LocalizedLabels?.[0]?.Label) {
            // Store with original field name as key
            displayNamesMap[attrName] = result.DisplayName.LocalizedLabels[0].Label;
          } else {
            // Fallback to normalized name if no display name
            displayNamesMap[attrName] = normalizedName;
          }
        } catch (error) {
          // If fetching fails for a specific attribute, use normalized name
          console.warn(`Failed to fetch display name for ${attrName}:`, error);
          displayNamesMap[attrName] = normalizeLookupFieldName(attrName);
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
 * Fetch principal names (users or teams) for a list of principal IDs
 * Used to display principal names in share audit details
 */
export async function getPrincipalNames(
  baseUrl: string,
  principalIds: string[],
  apiVersion: string = 'v9.2'
): Promise<UserNamesMap> {
  if (principalIds.length === 0) {
    return {};
  }

  const principalNamesMap: UserNamesMap = {};
  const api = buildApiUrl(baseUrl, apiVersion);

  // Fetch principals in batches to avoid too many concurrent requests
  const batchSize = 10;
  for (let i = 0; i < principalIds.length; i += batchSize) {
    const batch = principalIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (principalId) => {
        try {
          // Try fetching as systemuser first
          let url = `${api}/systemusers(${principalId})?$select=fullname`;
          let result = await fetchJson(url);

          if (result.fullname) {
            principalNamesMap[principalId] = result.fullname;
          } else {
            principalNamesMap[principalId] = principalId;
          }
        } catch (userError) {
          // If not a user, try fetching as team
          try {
            const url = `${api}/teams(${principalId})?$select=name`;
            const result = await fetchJson(url);

            if (result.name) {
              principalNamesMap[principalId] = `${result.name} (Team)`;
            } else {
              principalNamesMap[principalId] = principalId;
            }
          } catch (teamError) {
            // If both fail, use principal ID
            console.warn(`Failed to fetch principal name for ${principalId}:`, userError);
            principalNamesMap[principalId] = principalId;
          }
        }
      })
    );
  }

  return principalNamesMap;
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

    // Handle target records array (for relationship changes)
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '(empty)';
      }
      
      // Format each record, extracting the ID
      const formattedRecords = value.map((record) => {
        if (typeof record === 'object' && record !== null) {
          // Extract entity type from @odata.type
          const odataType = (record as any)['@odata.type'];
          const entityType = odataType ? odataType.replace('#Microsoft.Dynamics.CRM.', '') : 'record';
          
          // Find the ID field (usually ends with 'id')
          const idField = Object.keys(record).find(key => 
            key.endsWith('id') && key !== '@odata.type'
          );
          const id = idField ? (record as any)[idField] : 'unknown';
          
          return `${entityType} (${id})`;
        }
        return String(record);
      });
      
      return formattedRecords.join(', ');
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
