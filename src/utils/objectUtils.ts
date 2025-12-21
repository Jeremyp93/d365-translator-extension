/**
 * Object manipulation utilities
 */

/**
 * Deep clones an object using the native structuredClone API
 *
 * @param obj - Object to clone
 * @returns Deep cloned copy of the object
 *
 * @remarks
 * Supports most JavaScript types including Date, Map, Set, ArrayBuffer, etc.
 * Cannot handle functions or DOM nodes.
 *
 * @example
 * const original = { a: 1, b: { c: 2 }, date: new Date() };
 * const cloned = deepClone(original);
 * cloned.b.c = 3; // original.b.c is still 2
 * cloned.date instanceof Date // true (preserved!)
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}
