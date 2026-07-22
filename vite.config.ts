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
      '/api-mapping': {
        changeOrigin: true,
        target: 'http://52.172.32.88:8095',
        rewrite: (path) => path.replace(/^\/api-mapping/, '/api/v1'),
      },
    },
  },
})
