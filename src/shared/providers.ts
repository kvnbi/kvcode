export const PROVIDERS = ['anthropic', 'openai', 'google', 'deepseek', 'xai'] as const

export type ProviderId = (typeof PROVIDERS)[number]

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  deepseek: 'DeepSeek',
  xai: 'Grok'
}

export const PROVIDER_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-opus-5',
  openai: 'gpt-5.6-sol',
  google: 'gemini-3.7-flash',
  deepseek: 'deepseek-v4-pro',
  xai: 'grok-4.6'
}
