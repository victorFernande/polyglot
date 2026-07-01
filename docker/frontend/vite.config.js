import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.VITE_BUILD_ID || new Date().toISOString()

function buildVersionPlugin() {
  return {
    name: 'polyglot-build-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }, null, 2),
      })
    },
  }
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
  plugins: [react(), buildVersionPlugin()],
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