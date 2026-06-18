import { fetchJson, toArray, publishEntityViaWebApi } from './d365Api';
import { buildApiUrl, buildODataQuery, buildRetrieveLocLabelsUrl } from '../utils/urlBuilders';
import { buildBatchRequest, executeBatchRequest, BatchOperation } from '../utils/batchBuilder';
import { D365_API_VERSION } from '../config/constants';
import type { Label } from '../types';

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

/** Raw savedquery row shape returned by the Web API. */
interface SavedQueryRow {
  savedqueryid?: string;
  name?: string;
  description?: string;
  querytype?: number;
  isdefault?: boolean;
  iscustomizable?: { Value?: boolean };
}

/** List all views for an entity, public views (querytype 0) first, then by name. */
export async function listSystemViews(
  baseUrl: string,
  entityLogicalName: string,
  apiVersion?: string
): Promise<SavedQuerySummary[]> {
  const api = buildApiUrl(baseUrl, apiVersion);
  const query = buildODataQuery({
    select: ['name', 'description', 'savedqueryid', 'querytype', 'isdefault', 'iscustomizable'],
    filter: `returnedtypecode eq '${entityLogicalName}'`,
    orderby: 'name',
  });
  type Page = { value?: SavedQueryRow[]; '@odata.nextLink'?: string };
  const rows: SavedQuerySummary[] = [];
  let nextUrl: string | undefined = `${api}/savedqueries?${query}`;
  while (nextUrl) {
    const page = (await fetchJson(nextUrl)) as Page;
    for (const r of toArray(page?.value) as SavedQueryRow[]) {
      rows.push({
        savedQueryId: String(r.savedqueryid ?? ''),
        name: String(r.name ?? ''),
        description: String(r.description ?? ''),
        queryType: Number(r.querytype ?? -1),
        isDefault: Boolean(r.isdefault),
        isCustomizable: Boolean(r.iscustomizable?.Value ?? true),
      });
    }
    nextUrl = page?.['@odata.nextLink'];
  }

  return rows.sort((a, b) => {
    const ap = a.queryType === PUBLIC_VIEW_QUERY_TYPE ? 0 : 1;
    const bp = b.queryType === PUBLIC_VIEW_QUERY_TYPE ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });
}

/** Raw localized label row returned by RetrieveLocLabels. */
interface LocalizedLabelRow {
  Label?: string;
  LanguageCode?: number;
}

/**
 * Retrieve localized labels for one attribute (e.g. 'name') of a saved query.
 * Confirmed response shape: { Label: { LocalizedLabels: [{ Label, LanguageCode }] } }.
 */
export async function getViewLocalizedLabels(
  baseUrl: string,
  savedQueryId: string,
  attributeName: string,
  apiVersion?: string
): Promise<Label[]> {
  const url = buildRetrieveLocLabelsUrl({
    baseUrl,
    apiVersion,
    entitySetName: 'savedqueries',
    recordId: savedQueryId,
    attributeName,
    includeUnpublished: true,
  });
  const j = await fetchJson(url);
  return (toArray(j?.Label?.LocalizedLabels) as LocalizedLabelRow[]).map((l) => ({
    languageCode: Number(l.LanguageCode),
    label: String(l.Label ?? ''),
  }));
}

export interface ViewLabelEdit {
  attributeName: 'name' | 'description';
  labels: Label[]; // languageCode + label; empty labels filtered out
}

/** Save name/description localized labels for a view via batched SetLocLabels, then publish the entity. */
export async function saveViewTranslations(
  baseUrl: string,
  entityLogicalName: string,
  savedQueryId: string,
  edits: ViewLabelEdit[],
  apiVersion: string = D365_API_VERSION
): Promise<void> {
  const operations: BatchOperation[] = edits
    .filter((e) => e.labels.length > 0)
    .map((e) => ({
      method: 'POST' as const,
      url: `/api/data/${apiVersion}/SetLocLabels`,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: {
        EntityMoniker: {
          '@odata.type': 'Microsoft.Dynamics.CRM.savedquery',
          savedqueryid: savedQueryId,
        },
        AttributeName: e.attributeName,
        Labels: e.labels.map((l) => ({
          '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel',
          Label: l.label,
          LanguageCode: l.languageCode,
          IsManaged: false,
        })),
      },
    }));

  if (operations.length === 0) return;

  const batchRequest = buildBatchRequest({ baseUrl, apiVersion, operations });
  const result = await executeBatchRequest(batchRequest);
  if (!result.success) {
    throw new Error(
      `Batch SetLocLabels failed${
        result.innerErrorStatus ? ` (inner status ${result.innerErrorStatus})` : ''
      }: ${result.responseText}`
    );
  }

  await publishEntityViaWebApi(baseUrl, entityLogicalName, apiVersion);
}
