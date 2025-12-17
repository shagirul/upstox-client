import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev-only proxy:
 * Browser calls /upstox/... (same-origin) → Vite proxies to https://api.upstox.com/...
 * This helps if api.upstox.com does not allow CORS from localhost.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/upstox': {
        target: 'https://api.upstox.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/upstox/, ''),
      },
      '/markets': {
        target: 'https://www.marketsmojo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/markets/, ''),
      },
    },
  },
})
