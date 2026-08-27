import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function strictCsp(enabled: boolean): Plugin {
  return {
    name: 'kvcode-strict-csp',
    transformIndexHtml(html) {
      return enabled ? html.replace(" 'unsafe-inline'; style-src", "; style-src") : html
    }
  }
}

const shared = resolve('src/shared')
const renderer = resolve('src/renderer/src')

export default defineConfig(({ command }) => {
  const minify = command === 'build'

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      resolve: { alias: { '@shared': shared } },
      build: { minify }
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      resolve: { alias: { '@shared': shared } },
      build: { minify }
    },
    renderer: {
      root: resolve('src/renderer'),
      resolve: { alias: { '@renderer': renderer, '@shared': shared } },
      plugins: [react(), strictCsp(minify)],
      build: {
        minify,
        modulePreload: { polyfill: false },
        rollupOptions: { input: { index: resolve('src/renderer/index.html') } }
      }
    }
  }
})
