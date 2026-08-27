import { appendFileSync, chmodSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'
import { app } from 'electron'

interface ConversationEntry {
  role: 'user' | 'assistant'
  content: unknown
  at: string
}

let sessionId = ''
let sessionFile = ''
let sessionProject = ''

function projectKey(root: string | null): string {
  if (!root) return 'no-project'

  const digest = createHash('sha256').update(root).digest('hex').slice(0, 12)
  return `${basename(root) || 'project'}-${digest}`
}

export function projectFor(root: string | null): string {
  return projectKey(root)
}

export function startSession(root: string | null): string {
  sessionProject = projectKey(root)

  const directory = join(app.getPath('userData'), 'sessions', sessionProject)
  mkdirSync(directory, { recursive: true, mode: 0o700 })

  sessionId = new Date().toISOString().replace(/[:.]/g, '-')
  sessionFile = join(directory, `${sessionId}.jsonl`)

  return sessionId
}

export function appendEntry(entry: ConversationEntry): void {
  if (!sessionFile) return

  const isNew = !existsSync(sessionFile)
  appendFileSync(sessionFile, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 })

  if (isNew) chmodSync(sessionFile, 0o600)
}

export function currentSession(): { id: string; file: string; project: string } {
  return { id: sessionId, file: sessionFile, project: sessionProject }
}
