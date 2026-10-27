import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 inlines everything into one index.html (used for the APK shell and the web preview).
export default defineConfig({
  base: './',
  // Outlook .msg parsing (msgreader → iconv-lite) needs Node's Buffer; use the browser package.
  resolve: { alias: { buffer: 'buffer/' } },
  define: { global: 'globalThis' },
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  build: { outDir: process.env.SINGLE ? 'dist-single' : 'dist', assetsInlineLimit: process.env.SINGLE ? 100000000 : 4096 },
});
