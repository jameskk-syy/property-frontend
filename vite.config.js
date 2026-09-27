import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.onrender.com', '44f9-105-230-9-137.ngrok-free.app','0e20-154-159-238-162.ngrok-free.app'],
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        headers: {
          'Host': 'property.localhost:8001'
        }
      }
    }
  },
})
