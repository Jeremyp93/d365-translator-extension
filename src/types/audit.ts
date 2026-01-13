/**
 * Type definitions for D365 Audit History
 */

export interface AuditRecord {
  auditid: string;
  createdon: string;
  operation: number; // 1=Create, 2=Update, 3=Delete
  action: number;
  _userid_value: string;
  _objectid_value: string;
  objecttypecode: string;
  attributemask?: string;
  versionnumber: number;
  transactionid: string;
}

export interface TargetRecord {
  '@odata.type': string;
  [key: string]: unknown; // Entity ID and other properties
}

export interface Principal {
  '@odata.type': string;
  ownerid: string; // User or Team ID
  [key: string]: unknown;
}

export interface RelationshipAuditDetail {
  '@odata.type': '#Microsoft.Dynamics.CRM.RelationshipAuditDetail';
  RelationshipName: string;
  AuditRecord: AuditRecord;
  TargetRecords?: TargetRecord[];
}

export interface ShareAuditDetail {
  '@odata.type': '#Microsoft.Dynamics.CRM.ShareAuditDetail';
  OldPrivileges: string;
  NewPrivileges: string;
  AuditRecord: AuditRecord;
  Principal: Principal;
}

export interface AttributeAuditDetail {
  '@odata.type': '#Microsoft.Dynamics.CRM.AttributeAuditDetail';
  InvalidNewValueAttributes: string[];
  LocLabelLanguageCode: number;
  DeletedAttributes?: {
    Count: number;
    Keys: string[];
    Values: unknown[];
  };
  AuditRecord: AuditRecord;
  OldValue?: Record<string, unknown>;
  NewValue?: Record<string, unknown>;
}

export type AuditDetail = AttributeAuditDetail | RelationshipAuditDetail | ShareAuditDetail;

export interface AuditHistoryResponse {
  '@odata.context': string;
  AuditDetailCollection: {
    MoreRecords: boolean;
    PagingCookie: string;
    TotalRecordCount: number;
    AuditDetails: AuditDetail[];
  };
}

export interface ChangedField {
  fieldName: string; // Schema name or 'Relationship' for relationship changes
  displayName?: string; // Optional display name
  oldValue: unknown;
  newValue: unknown;
  relationshipName?: string; // For relationship audit details
  targetRecords?: TargetRecord[]; // For associate/disassociate actions
  principalId?: string; // For share audit details
  principalName?: string; // For share audit details (fetched separately)
}

export interface ParsedAuditRecord {
  auditId: string;
  createdOn: Date;
  operation: string; // Mapped from action field (preferred) or operation field
  userId: string;
  userName?: string; // Full name of the user (optional, fetched separately)
  changedFields: ChangedField[];
}

export type DisplayNamesMap = Record<string, string>;
export type UserNamesMap = Record<string, string>; // Map of userId GUID to full name

export interface AuditContext {
  clientUrl: string;
  entityLogicalName: string;
  recordId: string;
  apiVersion: string;
}
