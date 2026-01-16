import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '../context/ThemeContext';
import { PendingChangesProvider } from '../context/PendingChangesContext';
import ModalApp from './ModalApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <ThemeProvider>
    <PendingChangesProvider>
      <ModalApp />
    </PendingChangesProvider>
  </ThemeProvider>
);
