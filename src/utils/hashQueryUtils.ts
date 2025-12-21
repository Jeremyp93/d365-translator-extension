/**
 * Hash query parameter utilities for managing URL state without navigation
 */

/**
 * Updates hash query params without triggering hash navigation/remounts.
 * Keeps the current hash path (e.g. "#/report/form") intact.
 *
 * @param params - Object mapping parameter names to values (null/undefined to delete)
 * @example
 * replaceHashQuery({ entity: 'account', formId: '123-456' })
 * replaceHashQuery({ entity: null }) // removes entity param
 */
export function replaceHashQuery(params: Record<string, string | null | undefined>): void {
  const rawHash = window.location.hash || '';
  const withoutHash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  const [hashPath, hashQuery] = withoutHash.split('?');
  const urlParams = new URLSearchParams(hashQuery || '');

  // Update or delete each parameter
  Object.entries(params).forEach(([key, value]) => {
    if (value) urlParams.set(key, value);
    else urlParams.delete(key);
  });

  const nextHash = urlParams.toString() ? `#${hashPath}?${urlParams.toString()}` : `#${hashPath}`;
  window.history.replaceState(null, '', nextHash);
}
