import { buildRecordUrl } from '../utils/urlBuilders';
import { D365_API_VERSION } from '../config/constants';

export interface RetrievedRecord {
  etag: string;
  /**
   * Record body. Keys include raw values, annotated formatted values
   * (`field@OData.Community.Display.V1.FormattedValue`), and
   * lookup target info (`_field_value@Microsoft.Dynamics.CRM.lookuplogicalname`).
   */
  data: Record<string, unknown>;
}

export class RecordApiError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 400)}`);
    this.status = status;
    this.body = body;
  }
}

const ANNOTATIONS = 'OData.Community.Display.V1.FormattedValue,Microsoft.Dynamics.CRM.*';

export async function retrieveRecord(
  baseUrl: string,
  entitySetName: string,
  recordId: string,
  apiVersion: string = D365_API_VERSION
): Promise<RetrievedRecord> {
  const url = buildRecordUrl({ baseUrl, apiVersion, entitySetName, recordId });
  const r = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: `odata.include-annotations="${ANNOTATIONS}"`,
    },
  });
  if (!r.ok) throw new RecordApiError(r.status, await safeText(r));
  const json = await r.json() as Record<string, unknown>;
  const etag = String(json['@odata.etag'] || '');
  return { etag, data: json };
}

export async function patchRecord(
  baseUrl: string,
  entitySetName: string,
  recordId: string,
  body: Record<string, unknown>,
  etag: string,
  apiVersion: string = D365_API_VERSION
): Promise<void> {
  const url = buildRecordUrl({ baseUrl, apiVersion, entitySetName, recordId });
  const r = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Content-Type': 'application/json; charset=utf-8',
      ...(etag ? { 'If-Match': etag } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new RecordApiError(r.status, await safeText(r));
}

async function safeText(r: Response): Promise<string> {
  try { return await r.text(); } catch { return ''; }
}

/**
 * Extract the D365 error message from an API error body, falling back to the raw text.
 */
export function extractD365ErrorMessage(body: string): string {
  try {
    const j = JSON.parse(body);
    return String(j?.error?.message || j?.Message || body || '').trim();
  } catch {
    return body || '';
  }
}
