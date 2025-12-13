import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '', // keep empty for extension paths
  plugins: [react()],
  resolve: {
    alias: {
      // convenience aliases for your new shared structure
      '@': resolve(__dirname, 'src'),
      '@services': resolve(__dirname, 'src/services'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@pages': resolve(__dirname, 'src/report/pages'),
      '@components': resolve(__dirname, 'src/components'),
      '@report': resolve(__dirname, 'src/report'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // popup UI (html entry)
        popup: resolve(__dirname, 'src/popup/index.html'),

        // scripts that need to be emitted as standalone files
        pageController: resolve(__dirname, 'src/controller/pageController.ts'),
        relay: resolve(__dirname, 'src/relay/relay.ts'),
        background: resolve(__dirname, 'src/background.ts'),

        // report SPA (single HTML entry; React Router handles sub-routes)
        // If you renamed it, update the path below accordingly:
        report: resolve(__dirname, 'src/report/report.html'),

        // emit CSS with a stable name so manifest can reference it
        highlight: resolve(__dirname, 'src/styles/highlight.css'),
        flow: resolve(__dirname, 'src/styles/flow.css'),
      },
      output: {
        entryFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.includes('pageController')) return 'assets/pageController.js';
          if (name.includes('relay')) return 'assets/relay.js';
          if (name.includes('background')) return 'background.js';
          // popup bundle from index.html, report bundle from report/index.html
          return 'assets/[name].js';
        },
        assetFileNames: 'assets/[name][extname]', // ensures highlight.css => assets/highlight.css
        // (optional) keep chunk names predictable for debugging
        // chunkFileNames: 'assets/[name].js',
      },
    },
  },
});
