import { fetchJson } from './d365Api';
import { buildEntityDefinitionUrl, buildEntityManyToOneRelationshipsUrl } from '../utils/urlBuilders';
import { D365_API_VERSION } from '../config/constants';

/** Cache for the lifetime of the caller (passed in). */
export interface ResolverCache {
  entitySet: Map<string, string>;           // logicalName → entitySetName
  navProps: Map<string, NavigationPropertyInfo[]>; // logicalName → many-to-one nav props
}

export interface NavigationPropertyInfo {
  /** Attribute's logical name (e.g., "primarycontactid"). */
  referencingAttribute: string;
  /** Nav property to use in `<navProp>@odata.bind`. */
  referencingEntityNavigationPropertyName: string;
  /** Target entity logical name (e.g., "contact"). */
  referencedEntity: string;
  /** Target entity's entity set name (e.g., "contacts"). Undefined if resolution failed. */
  referencedEntitySet: string | undefined;
}

export function createResolverCache(): ResolverCache {
  return { entitySet: new Map(), navProps: new Map() };
}

export async function resolveEntitySet(
  baseUrl: string,
  entityLogicalName: string,
  cache: ResolverCache,
  apiVersion: string = D365_API_VERSION
): Promise<string> {
  const cached = cache.entitySet.get(entityLogicalName);
  if (cached) return cached;

  const url = buildEntityDefinitionUrl({
    baseUrl,
    apiVersion,
    entityLogicalName,
    select: ['EntitySetName', 'LogicalName'],
  });
  const j = await fetchJson(url) as { EntitySetName?: string };
  const set = j?.EntitySetName;
  if (!set) throw new Error(`EntitySetName missing for ${entityLogicalName}`);
  cache.entitySet.set(entityLogicalName, set);
  return set;
}

/**
 * Resolve many-to-one nav properties for the entity (lookups defined ON this entity).
 * Populates entitySet cache for every target entity encountered, so subsequent
 * PATCHes with lookup @odata.bind can build the target set URL without extra calls.
 */
export async function resolveManyToOneNavProps(
  baseUrl: string,
  entityLogicalName: string,
  cache: ResolverCache,
  apiVersion: string = D365_API_VERSION
): Promise<NavigationPropertyInfo[]> {
  const cached = cache.navProps.get(entityLogicalName);
  if (cached) return cached;

  type RelationshipRow = {
    ReferencingAttribute: string;
    ReferencingEntityNavigationPropertyName: string;
    ReferencedEntity: string;
  };
  type Page = { value: RelationshipRow[]; '@odata.nextLink'?: string };

  const rows: RelationshipRow[] = [];
  let nextUrl: string | undefined = buildEntityManyToOneRelationshipsUrl({
    baseUrl,
    apiVersion,
    entityLogicalName,
    select: ['ReferencingAttribute', 'ReferencingEntityNavigationPropertyName', 'ReferencedEntity'],
  });
  while (nextUrl) {
    const page = (await fetchJson(nextUrl)) as Page;
    if (page?.value?.length) rows.push(...page.value);
    nextUrl = page?.['@odata.nextLink'];
  }

  // Hydrate target entity sets in bounded batches (so lookup PATCH has everything ready).
  const targets = Array.from(new Set(rows.map((r) => r.ReferencedEntity)));
  const BATCH_SIZE = 50;
  const failures: Array<{ target: string; error: unknown }> = [];
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((t) => resolveEntitySet(baseUrl, t, cache, apiVersion))
    );
    settled.forEach((s, idx) => {
      if (s.status === 'rejected') failures.push({ target: chunk[idx], error: s.reason });
    });
  }
  if (failures.length) {
    console.warn(
      `[entitySetResolver] Failed to resolve ${failures.length} target entity set(s) for ${entityLogicalName}:`,
      failures
    );
  }

  const result: NavigationPropertyInfo[] = rows.map((r) => ({
    referencingAttribute: r.ReferencingAttribute,
    referencingEntityNavigationPropertyName: r.ReferencingEntityNavigationPropertyName,
    referencedEntity: r.ReferencedEntity,
    referencedEntitySet: cache.entitySet.get(r.ReferencedEntity),
  }));
  cache.navProps.set(entityLogicalName, result);
  return result;
}
