import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The connected SPA intentionally includes the existing LiveKit voice client.
  build: {
    chunkSizeWarningLimit: 1_200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'markdown', test: /node_modules\/markdown-to-jsx\// }],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
    },
  },
})
