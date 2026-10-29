import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync } from 'node:fs';

// SINGLE=1 inlines everything into one index.html (used for the APK shell and the web preview).
export default defineConfig({
  base: './',
  // Outlook .msg parsing (msgreader → iconv-lite) needs Node's Buffer; use the browser package.
  resolve: { alias: { buffer: 'buffer/' } },
  // __PUSH__: Firebase push is built in once android/app/google-services.json is there (src/push.js)
  define: { global: 'globalThis', __PUSH__: JSON.stringify(existsSync('android/app/google-services.json')) },
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  build: { outDir: process.env.SINGLE ? 'dist-single' : 'dist', assetsInlineLimit: process.env.SINGLE ? 100000000 : 4096 },
});
