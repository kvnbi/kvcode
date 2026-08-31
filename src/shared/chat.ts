import type { ProviderId } from './providers'

export type ChatEvent =
  | { type: 'start' }
  | { type: 'session'; id: string }
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; detail: string }
  | { type: 'file'; path: string }
  | { type: 'message'; text: string }
  | { type: 'usage'; tokens: number }
  | { type: 'compacted'; tokens: number }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface ChatSettings {
  mode: 'direct' | 'proxy'
  provider: ProviderId
  model: string
  storedKeys: ProviderId[]
  keychainAvailable: boolean
}
