export interface SessionSummary {
  id: string
  title: string
  updatedAt: string
  tokens?: number
  named?: boolean
}

export interface SessionEntry {
  role: 'user' | 'assistant'
  content: unknown
  at: string
  compacted?: boolean
}

export function parseEntries(raw: string): SessionEntry[] {
  const entries: SessionEntry[] = []

  for (const line of raw.split('\n')) {
    if (!line) continue

    try {
      entries.push(JSON.parse(line) as SessionEntry)
    } catch {
      continue
    }
  }

  return entries
}
