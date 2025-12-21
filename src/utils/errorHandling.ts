/**
 * Utility functions for error handling
 */

/**
 * Extracts a user-friendly error message from an unknown error object
 * @param error - The error object (unknown type for type safety)
 * @returns A string error message
 *
 * @example
 * try {
 *   await someAsyncOperation();
 * } catch (error: unknown) {
 *   setError(getErrorMessage(error));
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
