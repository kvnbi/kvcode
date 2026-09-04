import type { ProviderId } from './providers'
import type { Effort } from './effort'

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
  model: string
  instructions: string
  effort: Effort
  storedKeys: ProviderId[]
  keychainAvailable: boolean
}

export const MAX_INSTRUCTIONS = 8000
