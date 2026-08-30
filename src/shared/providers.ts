export const PROVIDERS = ['anthropic', 'openai', 'google', 'deepseek', 'xai'] as const

export type ProviderId = (typeof PROVIDERS)[number]

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  deepseek: 'DeepSeek',
  xai: 'Grok'
}

export const PROVIDER_CATALOG: Record<ProviderId, string[]> = {
  anthropic: ['claude-opus-5', 'claude-sonnet-5', 'claude-fable-5', 'claude-haiku-4-5'],
  openai: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'],
  google: ['gemini-3.7-flash', 'gemini-3.1-pro'],
  deepseek: ['deepseek-v4-pro', 'deepseek-v4-flash'],
  xai: ['grok-4.6']
}

export const PROVIDER_MODELS: Record<ProviderId, string> = {
  anthropic: PROVIDER_CATALOG.anthropic[0],
  openai: PROVIDER_CATALOG.openai[0],
  google: PROVIDER_CATALOG.google[0],
  deepseek: PROVIDER_CATALOG.deepseek[0],
  xai: PROVIDER_CATALOG.xai[0]
}
