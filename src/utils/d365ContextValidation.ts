/**
 * Utility functions for validating D365 context
 */

/**
 * Check if URL is a Dynamics 365 domain
 */
export function isDynamicsDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('.dynamics.com');
  } catch {
    return false;
  }
}

/**
 * Check if URL is a D365 form page
 */
export function isFormPage(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.pathname.includes('/main.aspx') &&
      urlObj.searchParams.get('pagetype') === 'entityrecord'
    );
  } catch {
    return false;
  }
}

/**
 * Validate if current context is a D365 form
 */
export interface D365ValidationResult {
  isDynamicsEnv: boolean;
  isValidContext: boolean;
}

export function validateD365Context(url: string | undefined): D365ValidationResult {
  if (!url) {
    return { isDynamicsEnv: false, isValidContext: false };
  }

  const isDynamics = isDynamicsDomain(url);
  const isForm = isFormPage(url);

  return {
    isDynamicsEnv: isDynamics,
    isValidContext: isDynamics && isForm,
  };
}
