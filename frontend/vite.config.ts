import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/app': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/files': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sw: resolve(__dirname, 'src/sw.ts'), // Service Worker entry
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'
        },
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios', 'zustand', 'clsx', 'tailwind-merge', 'zod'],
          map: ['maplibre-gl'],
          ocr: ['tesseract.js'],
          auth: ['oidc-client-ts', 'react-oidc-context']
        }
      },
    },
  },
  worker: {
    format: 'es',
  },
})
