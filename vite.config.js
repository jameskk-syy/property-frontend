import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['mysite.local', '.onrender.com'],
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'mysite.local',
        headers: {
          'Host': 'mysite.local'
        }
      }
    }
  },
})
