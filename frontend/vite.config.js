import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the browser calls /api on the Vite server itself, which
    // forwards to the backend. Same origin, so no CORS and any Vite port works.
    proxy: {
      '/api': {
        target: process.env.NETSIGHT_BACKEND || 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
