import { fetchJson } from './d365Api';

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
 * Fetch plugin trace logs from Dynamics 365 with optional filtering
 */
export async function getPluginTraceLogs(
  baseUrl: string,
  filters?: PluginTraceLogFilters
): Promise<PluginTraceLog[]> {
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
    filterParts.push(`createdon le ${filters.endDate}`);
  }

  if (filters?.hasException !== undefined) {
    if (filters.hasException) {
      filterParts.push(`exceptiondetails ne null`);
    } else {
      filterParts.push(`exceptiondetails eq null`);
    }
  }

  const filterQuery = filterParts.length > 0 ? `$filter=${filterParts.join(' and ')}` : '';
  const selectQuery = '$select=plugintracelogid,typename,messagename,mode,depth,performanceexecutionduration,operationtype,exceptiondetails,messageblock,createdon,correlationid';
  const orderQuery = '$orderby=createdon desc';
  const topQuery = '$top=100';

  const queryParts = [selectQuery, orderQuery, topQuery, filterQuery].filter(Boolean);
  const query = queryParts.join('&');

  const url = `${baseUrl}/api/data/v9.2/plugintracelogs?${query}`;
  const response = await fetchJson(url) as { value: PluginTraceLog[] };

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

  return logs;
}

/**
 * Fetch a single plugin trace log by ID
 */
export async function getPluginTraceLogById(
  baseUrl: string,
  id: string
): Promise<PluginTraceLog | null> {
  try {
    const url = `${baseUrl}/api/data/v9.2/plugintracelogs(${id})`;
    const log = await fetchJson(url) as PluginTraceLog;
    return log;
  } catch (error) {
    console.error('Failed to fetch plugin trace log:', error);
    return null;
  }
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
