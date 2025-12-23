import { CACHE_TTL, ENV_VAR } from "../config/constants";
import { buildApiUrl, buildODataQuery } from "../utils/urlBuilders";
import { fetchJson, getEnvironmentVariableValue } from "./d365Api";
import { storageGet, storageRemove, storageSet } from "./storageCache";

interface EnvironmentVariableDefinition {
  environmentvariabledefinitionid: string;
  schemaname: string;
}

interface EditingPermissionCache {
  when: number;
  isEditingAllowed: boolean;
}

const TTL_MS_DEFAULT = CACHE_TTL.EDITING_PERMISSION;
const CACHE_KEY = "editingEnabled";

/** Checks if editing is allowed in the given environment, using caching to minimize API calls. */
export async function checkEditingPermission(
  baseUrl: string,
  apiVersion: string = "v9.2",
  opts: { ttlMs?: number } = {}
): Promise<boolean> {
  const ttlMs = opts.ttlMs ?? TTL_MS_DEFAULT;
  const key = CACHE_KEY;

  const cached = await storageGet<EditingPermissionCache>(baseUrl, key);
  if (cached && Date.now() - cached.when < ttlMs) {
    return cached.isEditingAllowed;
  }

  const live = await fetchEditingPermissionFromApi(baseUrl, apiVersion);
  await storageSet<EditingPermissionCache>(baseUrl, key, {
    when: Date.now(),
    isEditingAllowed: live,
  });
  return live;
}

/** Fetches the editing permission status from the Dynamics 365 environment variable. */
async function fetchEditingPermissionFromApi(
  baseUrl: string,
  apiVersion: string = "v9.2"
): Promise<boolean> {
  try {
    // Step 1: Find environment variable definition
    const odataQuery = buildODataQuery({
      select: ["environmentvariabledefinitionid", "schemaname"],
      filter: `endswith(schemaname, '${ENV_VAR.EDITING_ENABLED_SUFFIX}')`,
      top: 1,
    });
    const definitionsUrl = `${buildApiUrl(baseUrl, apiVersion)}/environmentvariabledefinitions?${odataQuery}`;
    
    const definitionResponse = await fetchJson(definitionsUrl);
    const definitions = definitionResponse?.value as EnvironmentVariableDefinition[] | undefined;
    
    if (!definitions || definitions.length === 0) {
      // Variable not found - allow editing (fail-open)
      return true;
    }
    
    // Step 2: Get the value using schemaname
    const schemaName = definitions[0].schemaname;
    const value = await getEnvironmentVariableValue(baseUrl, apiVersion, schemaName);

    // Block only if value is exactly "false", otherwise allow (fail-open)
    // Value can be: "false" (block), "true" (allow), null (allow), or any other value (allow)
    return value !== "no" && value !== "false";
    
  } catch (error) {
    // Fail-open: on any error, allow editing
    console.error('[EditingPermission] Failed to check environment variable, allowing editing:', error);
    return true;
  }
}

export async function clearEditingPermissionCache(baseUrl: string): Promise<void> {
    await storageRemove(baseUrl, CACHE_KEY);
}
