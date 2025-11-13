import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: '',
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // popup UI (html entry)
        popup: resolve(__dirname, 'src/popup/index.html'),
        // extra JS/TS entries to emit as standalone files
        content: resolve(__dirname, 'src/content/content.ts'),
        pageController: resolve(__dirname, 'src/controller/pageController.ts'),
        report: resolve(__dirname, 'src/report/report.html'),
        relay: resolve(__dirname, 'src/relay/relay.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        // emit CSS with a stable name so manifest can reference it
        highlight: resolve(__dirname, 'src/styles/highlight.css'),
      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name?.includes('content')) return 'assets/content.js'
          if (assetInfo.name?.includes('pageController')) return 'assets/pageController.js'
          if (assetInfo.name?.includes('relay')) return 'assets/relay.js';
          if (assetInfo.name?.includes('background')) return 'background.js';
          // popup bundle from index.html
          return 'assets/[name].js'
        },
        assetFileNames: 'assets/[name][extname]', // ensures highlight.css => assets/highlight.css
      }
    }
  }
})
