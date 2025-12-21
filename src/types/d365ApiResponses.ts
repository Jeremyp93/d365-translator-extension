// D365 API Response Types

export interface ODataResponse<T> {
  value: T[];
  '@odata.context'?: string;
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export interface RetrieveProvisionedLanguagesResponse {
  RetrieveProvisionedLanguages?: number[];
  Value?: number[];
}

export interface OrganizationResponse {
  languagecode: number;
  name: string;
  organizationid: string;
}

export interface WhoAmIResponse {
  UserId: string;
  BusinessUnitId: string;
  OrganizationId: string;
}

export interface UserSettingsResponse {
  systemuserid: string;
  uilanguageid: number;
  helplanguageid: number;
  localeid: number;
}

export interface LocalizedLabel {
  Label: string;
  LanguageCode: number;
}

export interface DisplayNameMetadata {
  UserLocalizedLabel?: {
    Label: string;
  };
  LocalizedLabels?: LocalizedLabel[];
}

export interface EntityDefinitionResponse {
  LogicalName: string;
  MetadataId: string;
  DisplayName?: DisplayNameMetadata;
  SchemaName?: string;
  ObjectTypeCode?: number;
}

export interface AttributeMetadataResponse {
  MetadataId: string;
  LogicalName: string;
  AttributeType: string;
  '@odata.type': string;
  DisplayName?: DisplayNameMetadata;
  SchemaName?: string;
  IsCustomizable?: {
    Value: boolean;
  };
}
