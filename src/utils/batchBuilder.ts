export interface BatchOperation<TBody = Record<string, unknown>> {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: TBody;
}

export interface BatchOptions<TBody = Record<string, unknown>> {
  baseUrl: string;
  apiVersion?: string;
  operations: BatchOperation<TBody>[];
}

export interface BatchResponse {
  success: boolean;
  responseText: string;
  innerErrorStatus?: string;
}

/**
 * Build a D365 batch request body with a single atomic changeset
 * All operations succeed or fail together
 */
export function buildBatchRequest<TBody = Record<string, unknown>>(
  options: BatchOptions<TBody>
): {
  url: string;
  headers: Record<string, string>;
  body: string;
} {
  const { baseUrl, apiVersion = 'v9.2', operations } = options;

  // Validate that operations array is not empty
  if (!operations || operations.length === 0) {
    throw new Error('Batch request must contain at least one operation');
  }
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
  const batchBoundary = `batch_${crypto.randomUUID()}`;
  const changesetBoundary = `changeset_${crypto.randomUUID()}`;

  const lines: string[] = [];

  // Outer batch → one transactional changeset
  lines.push(`--${batchBoundary}`);
  lines.push(`Content-Type: multipart/mixed;boundary=${changesetBoundary}`);
  lines.push('');

  // Add each operation to the changeset
  operations.forEach((op, index) => {
    lines.push(`--${changesetBoundary}`);
    lines.push('Content-Type: application/http');
    lines.push('Content-Transfer-Encoding: binary');
    lines.push(`Content-ID: ${index + 1}`);
    lines.push('');
    lines.push(`${op.method} ${op.url} HTTP/1.1`);

    // Add headers
    if (op.headers) {
      Object.entries(op.headers).forEach(([key, value]) => {
        lines.push(`${key}: ${value}`);
      });
    }

    // Add body if present
    if (op.body !== undefined) {
      lines.push('');
      lines.push(JSON.stringify(op.body));
    }

    lines.push('');
  });

  // Close changeset and batch
  lines.push(`--${changesetBoundary}--`);
  lines.push(`--${batchBoundary}--`);

  return {
    url: `${trimmedBaseUrl}/api/data/${apiVersion}/$batch`,
    headers: {
      'Content-Type': `multipart/mixed;boundary=${batchBoundary}`,
      'OData-Version': '4.0',
      'OData-MaxVersion': '4.0',
      'Accept': 'application/json',
    },
    body: lines.join('\r\n'),
  };
}

/**
 * Execute a batch request and check for errors
 */
export async function executeBatchRequest(
  batchRequest: ReturnType<typeof buildBatchRequest>
): Promise<BatchResponse> {
  const response = await fetch(batchRequest.url, {
    method: 'POST',
    headers: batchRequest.headers,
    body: batchRequest.body,
  });

  const responseText = await response.text().catch(() => '');

  if (!response.ok) {
    return {
      success: false,
      responseText,
    };
  }

  // Check for inner errors (Dataverse returns 200 even if sub-requests fail)
  const innerErrorMatch = /HTTP\/1\.1\s(4\d\d|5\d\d)/.exec(responseText);
  if (innerErrorMatch) {
    return {
      success: false,
      responseText,
      innerErrorStatus: innerErrorMatch[1],
    };
  }

  return {
    success: true,
    responseText,
  };
}
