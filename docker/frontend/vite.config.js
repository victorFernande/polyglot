import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '100.100.218.96',
      'cortexai.tailb76d32.ts.net'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})