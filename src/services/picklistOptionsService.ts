import { fetchJson } from './d365Api';
import { buildAttributeUrl } from '../utils/urlBuilders';
import { D365_API_VERSION } from '../config/constants';

export interface PicklistOption {
  value: number;
  label: string;
}

const CAST_BY_TYPE: Record<string, string> = {
  Picklist: 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
  State:    'Microsoft.Dynamics.CRM.StateAttributeMetadata',
  Status:   'Microsoft.Dynamics.CRM.StatusAttributeMetadata',
};

export async function loadPicklistOptions(
  baseUrl: string,
  entityLogicalName: string,
  attributeLogicalName: string,
  attributeType: 'Picklist' | 'State' | 'Status',
  apiVersion: string = D365_API_VERSION
): Promise<PicklistOption[]> {
  const url = buildAttributeUrl({
    baseUrl,
    apiVersion,
    entityLogicalName,
    attributeLogicalName,
    castType: CAST_BY_TYPE[attributeType],
    select: ['LogicalName'],
    expand: 'OptionSet($select=Options)',
  });
  const j = await fetchJson(url) as {
    OptionSet?: {
      Options?: Array<{ Value: number; Label?: { UserLocalizedLabel?: { Label?: string } } }>;
    };
  };
  const opts = j?.OptionSet?.Options || [];
  return opts.map((o) => ({
    value: o.Value,
    label: o.Label?.UserLocalizedLabel?.Label || String(o.Value),
  }));
}
