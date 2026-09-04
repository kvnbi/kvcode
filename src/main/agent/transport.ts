import type Anthropic from '@anthropic-ai/sdk'
import type { ProviderId } from '@shared/providers'
import type { Effort } from '@shared/effort'
import { PROVIDER_CHEAP, providerOf } from '@shared/providers'
import { readPreferences } from '../services/settings'
import { readApiKey } from '../services/secrets'
import { createDirectTransport } from './directTransport'
import { createOpenAiTransport } from './openAiTransport'

export interface TransportParams {
  model: string
  system: string
  messages: Anthropic.MessageParam[]
  tools: Anthropic.Tool[]
  maxTokens: number
  effort: Effort
  signal: AbortSignal
}

export interface TransportStream {
  onText: (handler: (delta: string) => void) => void
  finalMessage: () => Promise<Anthropic.Message>
}

export interface ModelTransport {
  readonly mode: 'direct' | 'proxy'
  stream: (params: TransportParams) => TransportStream
}

export const BASE_URLS: Record<Exclude<ProviderId, 'anthropic'>, string> = {
  openai: 'https://api.openai.com/v1'
}

export interface ActiveModel {
  transport: ModelTransport
  model: string
}

export function createTransport(cheap = false): ActiveModel {
  const preferences = readPreferences()

  if (preferences.mode === 'proxy') {
    throw new Error('Hosted mode is not available yet. Switch to your own key in Settings.')
  }

  const provider = providerOf(preferences.model)
  const apiKey = readApiKey(provider)
  const model = cheap ? PROVIDER_CHEAP[provider] : preferences.model
  const override = process.env.KVCODE_BASE_URL ?? ''

  if (!apiKey) {
    throw new Error(`No API key is set for ${provider}. Add one in Settings.`)
  }

  if (provider === 'anthropic') {
    return { transport: createDirectTransport(apiKey, override), model }
  }

  return {
    transport: createOpenAiTransport(apiKey, override || BASE_URLS[provider], provider === 'openai'),
    model
  }
}
