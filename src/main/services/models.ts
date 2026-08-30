import { modelLabel } from '@shared/models'
import { PROVIDER_CATALOG } from '@shared/providers'
import type { ProviderId } from '@shared/providers'
import { BASE_URLS } from '../agent/transport'
import { readApiKey } from './secrets'

const EXCLUDED = [
  'embed',
  'whisper',
  'tts',
  'dall-e',
  'moderation',
  'image',
  'audio',
  'rerank',
  'transcribe',
  'realtime',
  'speech',
  'veo',
  'sora'
]

const cache = new Map<ProviderId, string[]>()

function chatOnly(ids: string[]): string[] {
  return ids
    .filter((id) => !EXCLUDED.some((word) => id.toLowerCase().includes(word)))
    .sort((a, b) => modelLabel(a).localeCompare(modelLabel(b)))
}

async function fetchIds(provider: ProviderId, apiKey: string): Promise<string[]> {
  const override = process.env.KVCODE_BASE_URL ?? ''
  const base =
    override || (provider === 'anthropic' ? 'https://api.anthropic.com/v1' : BASE_URLS[provider])
  const url = `${base}/models`

  const headers: Record<string, string> =
    provider === 'anthropic'
      ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      : { authorization: `Bearer ${apiKey}` }

  const response = await fetch(url, { headers })

  if (!response.ok) throw new Error(`Model list failed with ${response.status}`)

  const body = (await response.json()) as { data?: { id?: string }[] }

  return (body.data ?? []).map((entry) => entry.id).filter((id): id is string => typeof id === 'string')
}

export async function listModels(provider: ProviderId): Promise<string[]> {
  const cached = cache.get(provider)

  if (cached) return cached

  const fallback = chatOnly(PROVIDER_CATALOG[provider])
  const apiKey = readApiKey(provider)

  if (!apiKey) return fallback

  try {
    const ids = chatOnly(await fetchIds(provider, apiKey))
    const result = ids.length > 0 ? ids : fallback

    cache.set(provider, result)

    return result
  } catch {
    return fallback
  }
}

export function forgetModels(provider: ProviderId): void {
  cache.delete(provider)
}
