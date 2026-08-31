import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, shell } from 'electron'
import { parseEntries } from '@shared/sessions'
import type { SessionEntry, SessionSummary } from '@shared/sessions'

const INDEX = 'index.json'
const TITLE_LIMIT = 60

let currentId = ''

function root(): string {
  const directory = join(app.getPath('userData'), 'sessions')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  return directory
}

function fileFor(id: string): string {
  return join(root(), `${id}.jsonl`)
}

function readIndex(): SessionSummary[] {
  try {
    return JSON.parse(readFileSync(join(root(), INDEX), 'utf8')) as SessionSummary[]
  } catch {
    return []
  }
}

function writeIndex(sessions: SessionSummary[]): void {
  const target = join(root(), INDEX)
  writeFileSync(target, JSON.stringify(sessions, null, 2), { encoding: 'utf8', mode: 0o600 })
  chmodSync(target, 0o600)
}

function titleFrom(content: unknown): string {
  const text = typeof content === 'string' ? content.trim() : ''
  if (text.length === 0) return 'New chat'
  return text.length > TITLE_LIMIT ? `${text.slice(0, TITLE_LIMIT)}...` : text
}

export function listSessions(): SessionSummary[] {
  return readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function startSession(): string {
  currentId = new Date().toISOString().replace(/[:.]/g, '-')
  return currentId
}

export function currentSession(): string {
  return currentId
}

export function readSession(id: string): SessionEntry[] {
  if (!existsSync(fileFor(id))) return []

  return parseEntries(readFileSync(fileFor(id), 'utf8'))
}

export function openSession(id: string): SessionEntry[] {
  const entries = readSession(id)
  currentId = id
  return entries
}

export async function deleteSession(id: string): Promise<void> {
  if (existsSync(fileFor(id))) await shell.trashItem(fileFor(id))

  writeIndex(readIndex().filter((session) => session.id !== id))

  if (currentId === id) currentId = ''
}

export function renameSession(id: string, title: string): void {
  const trimmed = title.trim()
  writeIndex(readIndex().map((s) => (s.id === id ? { ...s, title: trimmed || s.title } : s)))
}

export function recordUsage(tokens: number): void {
  if (!currentId || tokens <= 0) return

  const sessions = readIndex()
  const existing = sessions.find((session) => session.id === currentId)

  if (!existing) return

  existing.tokens = tokens
  writeIndex(sessions)
}

export function sessionTokens(): number {
  if (!currentId) return 0

  return readIndex().find((session) => session.id === currentId)?.tokens ?? 0
}

export function appendEntry(entry: SessionEntry): void {
  if (!currentId) return

  const target = fileFor(currentId)
  const isNew = !existsSync(target)

  appendFileSync(target, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 })
  if (isNew) chmodSync(target, 0o600)

  const sessions = readIndex()
  const existing = sessions.find((session) => session.id === currentId)

  if (existing) {
    existing.updatedAt = entry.at
  } else {
    sessions.push({ id: currentId, title: titleFrom(entry.content), updatedAt: entry.at })
  }

  writeIndex(sessions)
}
