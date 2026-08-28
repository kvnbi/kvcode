export interface SessionSummary {
  id: string
  title: string
  updatedAt: string
}

export interface SessionEntry {
  role: 'user' | 'assistant'
  content: unknown
  at: string
}
