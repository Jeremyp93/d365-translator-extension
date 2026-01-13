import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../context/ThemeContext';
import { AuditHistoryApp } from './AuditHistoryApp';

const root = createRoot(document.getElementById('root')!);
root.render(
  <ThemeProvider>
    <AuditHistoryApp />
  </ThemeProvider>
);
