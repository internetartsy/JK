import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (needed for Docker)
    allowedHosts: true, // Allow all hosts (needed for Nginx proxy)
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/app': {
        target: process.env.VITE_FRAPPE_TARGET || 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
