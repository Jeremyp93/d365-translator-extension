/**
 * String manipulation utility functions
 */

/**
 * Normalizes a GUID by removing curly braces and converting to lowercase
 *
 * @param guid - GUID string (with or without braces)
 * @returns Normalized GUID in lowercase without braces
 *
 * @example
 * normalizeGuid("{A1B2C3D4-E5F6-...}") // returns "a1b2c3d4-e5f6-..."
 * normalizeGuid("A1B2C3D4-E5F6-...") // returns "a1b2c3d4-e5f6-..."
 * normalizeGuid(undefined) // returns ""
 */
export function normalizeGuid(guid: string | undefined): string {
  if (!guid) return "";
  return guid.replace(/[{}]/g, "").toLowerCase();
}
