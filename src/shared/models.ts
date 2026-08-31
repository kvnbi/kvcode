const ACRONYMS: Record<string, string> = { gpt: 'GPT', deepseek: 'DeepSeek', ai: 'AI' }
const VENDOR = new Set(['claude'])
const VERSION = /^v?\d+(\.\d+)*$/
const SNAPSHOT = /^\d{8}$/

function isDate(year?: string, month?: string, day?: string): boolean {
  return /^(19|20)\d{2}$/.test(year ?? '') && /^\d{2}$/.test(month ?? '') && /^\d{2}$/.test(day ?? '')
}

function tokens(id: string): string[] {
  const raw = id.split(/[-_]/).filter(Boolean)
  const out: string[] = []

  for (let index = 0; index < raw.length; index += 1) {
    if (isDate(raw[index], raw[index + 1], raw[index + 2])) {
      out.push(raw[index] + raw[index + 1] + raw[index + 2])
      index += 2
      continue
    }

    out.push(raw[index])
  }

  return out
}

export function modelLabel(id: string): string {
  const parts: string[] = []
  let pending: string[] = []

  const flush = () => {
    if (pending.length === 0) return

    parts.push(pending.join('.'))
    pending = []
  }

  let dated = ''

  for (const token of tokens(id)) {
    if (SNAPSHOT.test(token)) {
      dated = ` (${token.slice(0, 4)}-${token.slice(4, 6)}-${token.slice(6)})`
      continue
    }

    if (VERSION.test(token)) {
      pending.push(token.replace(/^v/, 'V'))
      continue
    }

    flush()

    const lower = token.toLowerCase()

    if (VENDOR.has(lower)) continue

    parts.push(ACRONYMS[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1))
  }

  flush()

  return parts.length > 0 ? parts.join(' ') + dated : id
}

const WINDOWS: [RegExp, number][] = [
  [/^claude-haiku/, 200000],
  [/^claude-(opus|sonnet|fable)-[5-9]/, 1000000],
  [/^claude-/, 200000],
  [/^gemini-/, 1000000],
  [/^gpt-5\.6/, 1050000],
  [/^gpt-5/, 400000],
  [/^gpt-4/, 128000],
  [/^o[0-9]/, 200000],
  [/^grok-4\.6/, 500000],
  [/^grok-4/, 256000],
  [/^grok-/, 131072],
  [/^deepseek-v[4-9]/, 1000000],
  [/^deepseek-/, 128000]
]

const DEFAULT_WINDOW = 128000

export function contextWindow(model: string): number {
  for (const [pattern, size] of WINDOWS) {
    if (pattern.test(model)) return size
  }

  return DEFAULT_WINDOW
}

export function formatTokens(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '0'

  const rounded = Math.round(count)

  if (rounded >= 1000000) {
    const millions = rounded / 1000000
    return `${millions >= 10 ? Math.round(millions) : Number(millions.toFixed(1))}M`
  }

  if (rounded >= 1000) {
    const thousands = rounded / 1000
    return `${thousands >= 100 ? Math.round(thousands) : Number(thousands.toFixed(1))}k`
  }

  return String(rounded)
}
