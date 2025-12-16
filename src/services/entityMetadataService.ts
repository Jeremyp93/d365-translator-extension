import { fetchJson } from './d365Api';

export interface EntitySummary {
  LogicalName: string;
  DisplayName: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  SchemaName: string;
  MetadataId: string;
  ObjectTypeCode: number;
}

export interface AttributeSummary {
  LogicalName: string;
  DisplayName: {
    UserLocalizedLabel?: {
      Label: string;
    };
    LocalizedLabels: Array<{
      Label: string;
      LanguageCode: number;
    }>;
  };
  AttributeType: string;
  MetadataId: string;
  SchemaName: string;
  IsCustomizable: {
    Value: boolean;
  };
}

/**
 * List all entities in the organization
 */
export async function listAllEntities(
  baseUrl: string,
  apiVersion: string = 'v9.2'
): Promise<EntitySummary[]> {
  const selectQuery = '$select=LogicalName,DisplayName,SchemaName,MetadataId,ObjectTypeCode';
  //const orderQuery = '$orderby=LogicalName';
  
  const url = `${baseUrl}/api/data/${apiVersion}/EntityDefinitions?${selectQuery}`;
  const response = await fetchJson(url) as { value: EntitySummary[] };
  
  return response.value.sort((a, b) =>
  String(a.LogicalName ?? "").localeCompare(String(b.LogicalName ?? ""))
) || [];
}

/**
 * List all attributes for a given entity
 */
export async function listEntityAttributes(
  baseUrl: string,
  entityLogicalName: string,
  apiVersion: string = 'v9.2'
): Promise<AttributeSummary[]> {
  const selectQuery = '$select=LogicalName,DisplayName,AttributeType,MetadataId,SchemaName,IsCustomizable';
  const orderQuery = '$orderby=LogicalName';
  
  const url = 
    `${baseUrl}/api/data/${apiVersion}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/Attributes?${selectQuery}&${orderQuery}`;
  
  const response = await fetchJson(url) as { value: AttributeSummary[] };
  
  return response.value || [];
}

/**
 * Get display name for an entity
 */
export function getEntityDisplayName(entity: EntitySummary): string {
  return entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName;
}

/**
 * Get display name for an attribute
 */
export function getAttributeDisplayName(attribute: AttributeSummary): string {
  return attribute.DisplayName?.UserLocalizedLabel?.Label || attribute.LogicalName;
}
