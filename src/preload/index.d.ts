import type { KvcodeApi } from './index'

declare global {
  interface Window {
    kvcode: KvcodeApi
  }
}

export {}
