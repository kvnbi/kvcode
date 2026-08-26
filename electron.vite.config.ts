import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

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
      plugins: [react()],
      build: {
        minify,
        rollupOptions: { input: { index: resolve('src/renderer/index.html') } }
      }
    }
  }
})
