const MAX_TITLE = 48
const MAX_RAW = 200
const LABEL = /^(title|conversation title|suggested title)\s*[:\-]\s*/i
const WRAPPERS = /^["'`*_\s]+|["'`*_\s]+$/g

export function cleanTitle(raw: string): string {
  for (const line of raw.split('\n')) {
    const candidate = tidy(line)

    if (candidate) return candidate
  }

  return ''
}

function tidy(line: string): string {
  if (line.length > MAX_RAW) return ''

  const trimmed = line.trim()

  if (trimmed.endsWith(':')) return ''

  const text = trimmed
    .replace(WRAPPERS, '')
    .replace(LABEL, '')
    .replace(WRAPPERS, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '')
    .trim()

  if (text.length < 3 || text.length > MAX_TITLE) return ''
  if (!/[a-z0-9]/i.test(text)) return ''
  if (text.split(' ').length < 2) return ''

  return text
}

export function shorten(text: string, limit = MAX_TITLE): string {
  const clean = text.replace(/\s+/g, ' ').trim()

  if (clean.length <= limit) return clean

  const cut = clean.slice(0, limit)
  const space = cut.lastIndexOf(' ')

  return `${space > limit / 2 ? cut.slice(0, space) : cut.trimEnd()}...`
}
