import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // changeOrigin MUST stay false. Vite's string shorthand
      // ('/api': 'http://localhost:8080') silently sets it to true, which
      // rewrites Host to localhost:8080 while the browser still sends
      // Origin: http://localhost:5173 on same-origin POSTs. The backend then
      // sees a cross-origin request from an origin that is not on its CORS
      // allowlist and Spring's CorsFilter rejects it with 403 "Invalid CORS
      // request" -- before the controller runs, so POST /api/auth/signin fails
      // while every GET (no Origin header) still works.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
