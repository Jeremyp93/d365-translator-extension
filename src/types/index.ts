export interface Label {
  languageCode: number;
  label: string;
}
export type Editable = Record<number, string>;

/** What kind of label are we editing on a form? */
export type LabelTarget =
  | { kind: 'field'; formId: string; attributeLogicalName: string; labelId?: string }
  | { kind: 'tab'; formId: string; tabId: string; labelId?: string }
  | { kind: 'section'; formId: string; tabId: string; sectionId: string; labelId?: string };

/** Form structure types for XML parsing and display */
export interface FormControl {
  id: string;
  cellId?: string; // The cell element's ID (used as labelId)
  name?: string;
  classId?: string;
  datafieldname?: string;
  disabled?: boolean;
  visible?: boolean;
  labels: Label[];
}

export interface FormSection {
  id: string;
  name?: string;
  visible?: boolean;
  showlabel?: boolean;
  labels: Label[];
  controls: FormControl[];
}

export interface FormColumn {
  width: string;
  sections: FormSection[];
}

export interface FormTab {
  id: string;
  name?: string;
  visible?: boolean;
  showlabel?: boolean;
  labels: Label[];
  columns: FormColumn[];
}

export interface FormStructure {
  tabs: FormTab[];
  rawXml: string;
  rawXmlByLcid?: Record<number, string>; // XML for each language
}

/** Option Set (Picklist) types */
export type OptionSetType = 'Picklist' | 'MultiSelectPicklist' | 'Boolean' | 'Status' | 'State';

export interface OptionValue {
  value: number;
  labels: Label[];
  description?: Label[];
  color?: string;
}

export interface OptionSetMetadata {
  isGlobal: boolean;
  name: string | null; // For global: "industrycode", for local: null
  displayName?: string;
  optionSetType?: OptionSetType;
  options: OptionValue[];
  metadataId: string;
}

export interface GlobalOptionSetSummary {
  name: string; // Logical name (e.g., "industrycode")
  displayName: string; // User-facing name
  description?: string;
  metadataId: string;
}

export type { PluginTraceLog, PluginTraceLogFilters, PaginatedResponse } from '../services/pluginTraceLogService';