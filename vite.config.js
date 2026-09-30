import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE (current state): This config is correct for the frontend↔backend data
// flow and does NOT affect report exports. PDF/Excel exports are built entirely
// in the browser from data already fetched, so the proxy below is not involved
// in the "empty export" issue (that was a bug in exportReport.js, now fixed).
// Left as-is; comments added only to document what each setting does.
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev server port. The app is served at http://localhost:3000.
    port: 3000,
    // Listen on all interfaces (needed so WSL/other hosts can reach the dev server).
    host: true,
    // Extra hostnames allowed to load the dev server (Frappe site + Render deploys).
    allowedHosts: ['mysite.local', '.onrender.com'],
    proxy: {
      // All /api/* calls are forwarded to the Frappe backend. api/client.js uses
      // baseUrl '/api', so this is what connects the UI to real GL data.
      '/api': {
        // Backend origin. Override with VITE_BACKEND_URL (see .env.example) when
        // the Frappe bench runs somewhere other than 127.0.0.1:8001.
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001',
        // Rewrite the Origin header to the target so Frappe accepts the request.
        changeOrigin: true,
        // Allow self-signed/HTTP backends in dev.
        secure: false,
        // Frappe issues session cookies scoped to its site host; rewrite the
        // cookie domain so the browser stores them under the dev host.
        cookieDomainRewrite: 'mysite.local',
        headers: {
          // Frappe resolves the site by Host header; pin it to the site name.
          'Host': 'mysite.local'
        }
      }
    }
  },
})
