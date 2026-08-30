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
