/**
 * Auto-dismiss a message after specified delay
 */

import { useEffect } from 'react';

export function useAutoDismiss(
  message: string | null,
  clearMessage: () => void,
  delay: number = 3000
) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(clearMessage, delay);
      return () => clearTimeout(timer);
    }
  }, [message, clearMessage, delay]);
}
