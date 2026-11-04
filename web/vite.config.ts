import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'offline-inventory',
      async writeBundle() {
        const root = new URL('./dist/', import.meta.url).pathname
        // Hosting enriches index.html with metadata. Cache an untouched shell so
        // integrity checks and offline cache repair remain valid in production.
        await writeFile(join(root, 'app-shell.html'), await readFile(join(root, 'index.html')))
        const files: { url: string; bytes: number }[] = []
        const digest = createHash('sha256')
        async function visit(dir: string) {
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name)
            if (entry.isDirectory()) await visit(path)
            else if (/\.(js|css|html|png|svg|ico|woff2|wasm|json|bin|txt|data)$/.test(entry.name) && !['index.html', 'offline-manifest.json', 'sw.js'].includes(entry.name) && !entry.name.startsWith('workbox-')) {
              const data = await readFile(path), url = '/' + relative(root, path)
              files.push({ url, bytes: data.length }); digest.update(url); digest.update(data)
            }
          }
        }
        await visit(root)
        await writeFile(join(root, 'offline-manifest.json'), JSON.stringify({ version: digest.digest('hex'), bytes: files.reduce((n, f) => n + f.bytes, 0), files }))
      },
    },
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // SRI lets Workbox safely repair a missing precache entry after download.
        manifestTransforms: [async entries => ({
          manifest: await Promise.all(entries.map(async entry => {
            const data = await readFile(new URL(`./dist/${decodeURI(entry.url)}`, import.meta.url))
            return { ...entry, integrity: `sha256-${createHash('sha256').update(data).digest('base64')}` }
          })), warnings: [],
        })],
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,wasm,json,bin,txt,data}'],
        globIgnores: ['**/index.html'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Let an active reading finish before a new deployment takes over.
        skipWaiting: false,
        clientsClaim: false,
        // Serve index.html for all navigation requests (SPA fallback).
        // Without this, opening from iPhone home screen shows blank —
        // the SW intercepts the navigation but has no response for it.
        navigateFallback: '/app-shell.html',
        navigateFallbackDenylist: [/^\/api/, /^\/v1/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Manifest is defined in web/public/manifest.json (single source of truth).
      // VitePWA reads it from there automatically when manifest is false.
      manifest: false,
    }),
  ],
  server: { host: true },
})
