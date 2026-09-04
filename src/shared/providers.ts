export const PROVIDERS = ['anthropic', 'openai'] as const

export type ProviderId = (typeof PROVIDERS)[number]

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI'
}

export const PROVIDER_CATALOG: Record<ProviderId, string[]> = {
  anthropic: ['claude-opus-5', 'claude-sonnet-5'],
  openai: ['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']
}

export const PROVIDER_CHEAP: Record<ProviderId, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5.6-luna'
}

export const PROVIDER_MODELS: Record<ProviderId, string> = {
  anthropic: PROVIDER_CATALOG.anthropic[0],
  openai: PROVIDER_CATALOG.openai[0]
}

export function providerOf(model: string): ProviderId {
  return model.startsWith('claude-') ? 'anthropic' : 'openai'
}

export function pickModel(current: string, stored: ProviderId[]): string {
  if (stored.length === 0 || stored.includes(providerOf(current))) return current

  const fallback = PROVIDERS.find((provider) => stored.includes(provider))

  return fallback ? PROVIDER_MODELS[fallback] : current
}

export function isKnownModel(id: string): boolean {
  return PROVIDERS.some((provider) => PROVIDER_CATALOG[provider].includes(id))
}
