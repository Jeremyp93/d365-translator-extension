import { fetchJson } from './d365Api';
import { buildApiUrl } from '../utils/urlBuilders';

export interface PluginTraceLog {
  plugintracelogid: string;
  typename: string;
  messagename: string;
  mode: number;
  depth: number;
  performanceexecutionduration?: number;
  operationtype: number;
  exceptiondetails?: string;
  messageblock?: string;
  createdon: string;
  correlationid?: string;
}

export interface PaginatedResponse<T> {
  records: T[];
  nextLink: string | null;
}

export interface PluginTraceLogFilters {
  typename?: string;
  messagename?: string;
  mode?: number;
  minDuration?: number;
  maxDuration?: number;
  startDate?: string;
  endDate?: string;
  hasException?: boolean;
}

/**
 * Fetch plugin trace logs from Dynamics 365 with optional filtering and pagination
 */
export async function getPluginTraceLogs(
  baseUrl: string,
  filters?: PluginTraceLogFilters,
  pageSize: number = 100,
  apiVersion: string = 'v9.2'
): Promise<PaginatedResponse<PluginTraceLog>> {
  const filterParts: string[] = [];

  if (filters?.typename) {
    filterParts.push(`contains(typename, '${filters.typename}')`);
  }

  if (filters?.messagename) {
    filterParts.push(`contains(messagename, '${filters.messagename}')`);
  }

  if (filters?.mode !== undefined && filters.mode !== -1) {
    filterParts.push(`mode eq ${filters.mode}`);
  }

  if (filters?.startDate) {
    filterParts.push(`createdon ge ${filters.startDate}`);
  }

  if (filters?.endDate) {
    // Use exclusive upper bound at next day to include all logs on endDate
    const endDate = new Date(filters.endDate + 'T00:00:00.000Z');
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const nextDay = endDate.toISOString().split('T')[0];
    filterParts.push(`createdon lt ${nextDay}`);
  }

  if (filters?.hasException !== undefined) {
    if (filters.hasException) {
      filterParts.push(`(exceptiondetails ne null and exceptiondetails ne '')`);
    }
    // } else {
    //   filterParts.push(`(exceptiondetails eq null or exceptiondetails eq '')`);
    // }
  }

  const filterQuery = filterParts.length > 0 ? `$filter=${filterParts.join(' and ')}` : '';
  const selectQuery = '$select=plugintracelogid,typename,messagename,mode,depth,performanceexecutionduration,operationtype,exceptiondetails,messageblock,createdon,correlationid';
  const orderQuery = '$orderby=createdon desc,plugintracelogid desc';

  const queryParts = [selectQuery, orderQuery, filterQuery].filter(Boolean);
  const query = queryParts.join('&');

  const api = buildApiUrl(baseUrl, apiVersion);
  const url = `${api}/plugintracelogs?${query}`;
  const response = await fetchJson(url, {
    headers: {
      'Prefer': `odata.maxpagesize=${pageSize}`
    }
  }) as { value: PluginTraceLog[]; '@odata.nextLink'?: string };

  let logs = response.value || [];

  // Apply client-side duration filtering if needed
  if (filters?.minDuration !== undefined || filters?.maxDuration !== undefined) {
    logs = logs.filter((log: PluginTraceLog) => {
      const duration = log.performanceexecutionduration || 0;
      if (filters.minDuration !== undefined && duration < filters.minDuration) {
        return false;
      }
      if (filters.maxDuration !== undefined && duration > filters.maxDuration) {
        return false;
      }
      return true;
    });
  }

  return {
    records: logs,
    nextLink: response['@odata.nextLink'] || null
  };
}

/**
 * Fetch the next page of plugin trace logs using the nextLink URL
 */
export async function getNextPageOfLogs(
  nextLink: string,
  pageSize: number = 100
): Promise<PaginatedResponse<PluginTraceLog>> {
  const response = await fetchJson(nextLink, {
    headers: {
      'Prefer': `odata.maxpagesize=${pageSize}`
    }
  }) as { value: PluginTraceLog[]; '@odata.nextLink'?: string };

  return {
    records: response.value || [],
    nextLink: response['@odata.nextLink'] || null
  };
}

/**
 * Format duration for display (duration is in milliseconds)
 */
export function formatDuration(durationMs?: number): string {
  if (!durationMs) return '0ms';
  
  if (durationMs < 1000) {
    return `${durationMs.toFixed(0)}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Get mode label
 */
export function getModeLabel(mode: number): string {
  switch (mode) {
    case 0:
      return 'Synchronous';
    case 1:
      return 'Asynchronous';
    default:
      return 'Unknown';
  }
}

/**
 * Get operation type label
 */
export function getOperationTypeLabel(operationType: number): string {
  switch (operationType) {
    case 0:
      return 'Plugin';
    case 1:
      return 'Workflow';
    case 2:
      return 'Custom Action';
    default:
      return 'Unknown';
  }
}

/**
 * Get duration color based on performance (in milliseconds)
 */
export function getDurationColor(durationMs?: number): 'success' | 'warning' | 'danger' {
  if (!durationMs) return 'success';
  if (durationMs < 1000) return 'success'; // Green for < 1s
  if (durationMs < 5000) return 'warning'; // Yellow for 1-5s
  return 'danger'; // Red for > 5s
}

/**
 * Fetch all plugin trace logs for a specific correlation ID
 * Used for building correlation flow diagrams
 */
export async function getLogsForCorrelation(
  baseUrl: string,
  correlationId: string,
  apiVersion: string = 'v9.2'
): Promise<PluginTraceLog[]> {
  const selectQuery = '$select=plugintracelogid, correlationid,typename,messagename,mode,depth,performanceexecutionduration,operationtype,exceptiondetails,messageblock,createdon,correlationid';
  const filterQuery = `$filter=correlationid eq '${correlationId}'`;
  const orderQuery = '$orderby=createdon asc,plugintracelogid asc'; // Chronological order for flow diagram
  
  const query = `${selectQuery}&${filterQuery}&${orderQuery}`;
  const api = buildApiUrl(baseUrl, apiVersion);
  const url = `${api}/plugintracelogs?${query}`;

  const response = await fetchJson(url) as { value: PluginTraceLog[] };
  return response.value || [];
}
