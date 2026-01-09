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

export interface AuditDetail {
  '@odata.type': string;
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
  fieldName: string; // Schema name
  displayName?: string; // Optional display name
  oldValue: unknown;
  newValue: unknown;
}

export interface ParsedAuditRecord {
  auditId: string;
  createdOn: Date;
  operation: 'Create' | 'Update' | 'Delete';
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
