/**
 * Form type utilities for Dynamics 365 form metadata
 */

/**
 * Form type constants from Dynamics 365
 */
export enum FormType {
  Main = 2,
  QuickCreate = 6,
  QuickView = 7,
  Card = 11,
  MainInteractive = 12,
}

/**
 * Maps form type number to display label
 *
 * @param type - Form type number from D365
 * @returns Human-readable form type label
 * @example
 * getFormTypeLabel(2) // returns "Main Forms"
 */
export function getFormTypeLabel(type: number): string {
  switch (type) {
    case FormType.Main:
      return 'Main Forms';
    case FormType.QuickCreate:
      return 'Quick Create Forms';
    case FormType.QuickView:
      return 'Quick View Forms';
    case FormType.Card:
      return 'Card Forms';
    case FormType.MainInteractive:
      return 'Main Interactive Forms';
    default:
      return `Form Type ${type}`;
  }
}
