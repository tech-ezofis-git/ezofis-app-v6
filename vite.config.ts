import { lingui } from '@lingui/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  assetsInclude: ['**/*.zip'],
  plugins: [
    tanstackRouter({ autoCodeSplitting: true, target: 'react' }),
    viteReact({
      babel: {
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      },
    }),
    tailwindcss(),
    lingui(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Tailscale GPU OpenAI-compatible API (avoids browser CORS in dev)
      '/qwen-proxy': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/qwen-proxy/, ''),
        secure: true,
        target: 'https://gpu-box.tail115a9a.ts.net',
      },
    },
  },
})
