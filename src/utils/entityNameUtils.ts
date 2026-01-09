/**
 * Utility functions for entity name handling
 */

/**
 * Converts a D365 entity logical name to its plural entity set name
 *
 * D365 pluralization rules:
 * - Entities ending in "s", "x", "z", "ch", "sh": add "es"
 * - Entities ending in consonant + "y": change "y" to "ies"
 * - Most other entities: add "s"
 *
 * Examples:
 * - account → accounts
 * - contact → contacts
 * - opportunity → opportunities
 * - business → businesses
 * - activity → activities
 *
 * @param logicalName The entity logical name (singular)
 * @returns The entity set name (plural)
 */
export function pluralizeEntityName(logicalName: string): string {
  if (!logicalName) return logicalName;

  const lower = logicalName.toLowerCase();

  // Entities ending in s, x, z, ch, sh: add "es"
  if (
    lower.endsWith('s') ||
    lower.endsWith('x') ||
    lower.endsWith('z') ||
    lower.endsWith('ch') ||
    lower.endsWith('sh')
  ) {
    return logicalName + 'es';
  }

  // Entities ending in consonant + y: change y to ies
  if (lower.endsWith('y') && lower.length > 1) {
    const beforeY = lower[lower.length - 2];
    // Check if the character before 'y' is a consonant (not a, e, i, o, u)
    if (!'aeiou'.includes(beforeY)) {
      return logicalName.slice(0, -1) + 'ies';
    }
  }

  // Default: add "s"
  return logicalName + 's';
}
