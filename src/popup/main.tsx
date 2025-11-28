import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../context/ThemeContext';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);