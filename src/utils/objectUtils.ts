/**
 * Object manipulation utilities
 */

/**
 * Deep clones an object using JSON serialization
 *
 * @param obj - Object to clone
 * @returns Deep cloned copy of the object
 *
 * @warning This method has limitations:
 * - Loses functions
 * - Loses Date objects (converts to strings)
 * - Loses undefined values
 * - Cannot handle circular references
 * - Loses Map, Set, and other non-plain objects
 *
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * cloned.b.c = 3; // original.b.c is still 2
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
