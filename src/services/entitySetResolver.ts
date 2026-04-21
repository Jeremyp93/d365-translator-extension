import { fetchJson } from './d365Api';
import { buildEntityDefinitionUrl, buildApiUrl } from '../utils/urlBuilders';
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
  /** Target entity's entity set name (e.g., "contacts"). */
  referencedEntitySet: string;
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

  const api = buildApiUrl(baseUrl, apiVersion);
  const url =
    `${api}/EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')` +
    `/ManyToOneRelationships?$select=ReferencingAttribute,ReferencingEntityNavigationPropertyName,ReferencedEntity`;
  const j = await fetchJson(url) as { value: Array<{
    ReferencingAttribute: string;
    ReferencingEntityNavigationPropertyName: string;
    ReferencedEntity: string;
  }> };

  // Hydrate target entity sets in parallel (so lookup PATCH has everything ready).
  const targets = Array.from(new Set((j.value || []).map((r) => r.ReferencedEntity)));
  await Promise.all(
    targets.map((t) =>
      resolveEntitySet(baseUrl, t, cache, apiVersion).catch(() => undefined)
    )
  );

  const result: NavigationPropertyInfo[] = (j.value || []).map((r) => ({
    referencingAttribute: r.ReferencingAttribute,
    referencingEntityNavigationPropertyName: r.ReferencingEntityNavigationPropertyName,
    referencedEntity: r.ReferencedEntity,
    referencedEntitySet: cache.entitySet.get(r.ReferencedEntity) || '',
  }));
  cache.navProps.set(entityLogicalName, result);
  return result;
}
