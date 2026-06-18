import { fetchJson, toArray } from './d365Api';
import { buildApiUrl } from '../utils/urlBuilders';

export interface SavedQuerySummary {
  savedQueryId: string;
  name: string;
  description: string;
  queryType: number;
  isDefault: boolean;
  isCustomizable: boolean;
}

/** querytype 0 is the public/main grid view shown in the view selector. */
export const PUBLIC_VIEW_QUERY_TYPE = 0;

const QUERY_TYPE_LABELS: Record<number, string> = {
  0: 'Public',
  1: 'Advanced Find',
  2: 'Associated',
  4: 'Quick Find',
  8: 'Reporting',
  16: 'Offline Filter',
  32: 'Lookup',
  64: 'SM Appointment',
  128: 'Outlook Filters',
  256: 'Address Book',
  1024: 'Interactive Workflow',
  2048: 'Offline Template',
  4096: 'Custom',
};

export function queryTypeLabel(queryType: number): string {
  return QUERY_TYPE_LABELS[queryType] ?? `Type ${queryType}`;
}
