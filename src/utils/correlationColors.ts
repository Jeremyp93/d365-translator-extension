/**
 * Deterministic color assignment for correlation IDs.
 * Uses djb2 hash to map IDs to one of 16 evenly-spaced HSL hues.
 */

const HUE_COUNT = 16;
const SATURATION = 60;
const LIGHTNESS = 55;

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Returns a deterministic HSL color string for a given correlation ID.
 * Same ID always produces the same color.
 */
export function getCorrelationColor(correlationId: string): string {
  const hash = djb2Hash(correlationId);
  const hue = (hash % HUE_COUNT) * (360 / HUE_COUNT);
  return `hsl(${hue}, ${SATURATION}%, ${LIGHTNESS}%)`;
}
