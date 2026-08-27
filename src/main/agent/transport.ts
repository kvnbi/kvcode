import type Anthropic from '@anthropic-ai/sdk'
import type { ProviderId } from '@shared/providers'
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

const BASE_URLS: Record<Exclude<ProviderId, 'anthropic'>, string> = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  deepseek: 'https://api.deepseek.com/v1',
  xai: 'https://api.x.ai/v1'
}

interface ActiveModel {
  transport: ModelTransport
  model: string
}

export function createTransport(): ActiveModel {
  const preferences = readPreferences()

  if (preferences.mode === 'proxy') {
    throw new Error('Hosted mode is not available yet. Switch to your own key in Settings.')
  }

  const provider = preferences.provider
  const apiKey = readApiKey(provider)
  const model = preferences.models[provider]

  if (!apiKey) {
    throw new Error(`No API key is set for ${provider}. Add one in Settings.`)
  }

  if (provider === 'anthropic') {
    return { transport: createDirectTransport(apiKey, preferences.baseUrl), model }
  }

  return {
    transport: createOpenAiTransport(
      apiKey,
      preferences.baseUrl || BASE_URLS[provider],
      provider === 'openai'
    ),
    model
  }
}
