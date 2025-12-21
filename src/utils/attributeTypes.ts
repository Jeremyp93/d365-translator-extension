/**
 * Utility functions for D365 attribute type handling
 */

import type { BadgeProps } from "@fluentui/react-components";

type BadgeColor = NonNullable<BadgeProps['color']>;

/**
 * Returns the appropriate badge color for a D365 attribute type.
 * Colors are assigned by category for visual consistency:
 * - Text types: informative (blue)
 * - Numeric types: success (green)
 * - Choice types: brand (purple)
 * - Relationship types: important (red)
 * - DateTime types: warning (orange)
 * - Unique identifiers: severe (dark red)
 *
 * @param attributeType - The D365 attribute type (e.g., "String", "Picklist", "Lookup")
 * @returns Badge color variant for visual categorization
 *
 * @example
 * const color = getAttributeTypeColor("String"); // returns "informative"
 * const color = getAttributeTypeColor("Lookup"); // returns "important"
 */
export function getAttributeTypeColor(attributeType: string): BadgeColor {
  const type = attributeType.toLowerCase();

  // Text types
  if (type.includes("string") || type === "memo") {
    return "informative";
  }

  // Numeric types
  if (type.includes("integer") || type.includes("decimal") ||
      type.includes("double") || type.includes("money")) {
    return "success";
  }

  // Choice types (picklists, booleans, state/status)
  if (type.includes("picklist") || type.includes("boolean") ||
      type.includes("status") || type.includes("state")) {
    return "brand";
  }

  // Relationship types (lookups, customer, owner)
  if (type.includes("lookup") || type.includes("customer") ||
      type.includes("owner")) {
    return "important";
  }

  // DateTime types
  if (type.includes("datetime")) {
    return "warning";
  }

  // Unique identifier
  if (type.includes("uniqueidentifier")) {
    return "severe";
  }

  // Default fallback
  return "subtle";
}
