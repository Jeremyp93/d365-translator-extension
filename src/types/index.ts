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