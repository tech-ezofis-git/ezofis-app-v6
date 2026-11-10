import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync } from 'node:fs';

// SINGLE=1 inlines everything into one index.html (used for the APK shell and the web preview).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Local development: the app calls /api on its own origin (VITE_API_BASE=/api in .env.development.local)
  // and the dev server forwards it to the local API, so there is no CORS. scripts/dev-start.ps1 refuses to start
  // while this points at production.
  const proxyTarget = env.VITE_API_PROXY_TARGET;
  return {
    base: './',
    // Outlook .msg parsing (msgreader → iconv-lite) needs Node's Buffer; use the browser package.
    resolve: { alias: { buffer: 'buffer/' } },
    // __PUSH__: Firebase push is built in once android/app/google-services.json is there (src/push.js)
    define: { global: 'globalThis', __PUSH__: JSON.stringify(existsSync('android/app/google-services.json')) },
    plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
    server: {
      port: 5173,
      strictPort: true,
      ...(proxyTarget ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true, secure: false } } } : {}),
    },
    build: { outDir: process.env.SINGLE ? 'dist-single' : 'dist', assetsInlineLimit: process.env.SINGLE ? 100000000 : 4096 },
  };
});
