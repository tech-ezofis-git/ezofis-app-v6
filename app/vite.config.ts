import { lingui } from '@lingui/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import fs from 'node:fs'
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
    {
      name: 'save-light-css-plugin',
      configureServer(server: any) {
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.method === 'POST' && (req.url === '/api/save-light-css' || req.url === '/api/save-dark-css')) {
            const fileName = req.url === '/api/save-dark-css' ? 'dark.css' : 'light.css'
            let body = ''
            req.on('data', (chunk: any) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const data = JSON.parse(body)
                const targetPath = resolve(__dirname, `./src/styles/${fileName}`)
                fs.writeFileSync(targetPath, data.cssContent, 'utf-8')
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true }))
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/v5': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v5/, ''),
        secure: false,
        target: 'https://app.ezofis.com',
      },
      '/css': {
        changeOrigin: true,
        secure: false,
        target: 'https://app.ezofis.com',
      },
      '/js': {
        changeOrigin: true,
        secure: false,
        target: 'https://app.ezofis.com',
      },
      '/img': {
        changeOrigin: true,
        secure: false,
        target: 'https://app.ezofis.com',
      },
      '/fonts': {
        changeOrigin: true,
        secure: false,
        target: 'https://app.ezofis.com',
      },
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
