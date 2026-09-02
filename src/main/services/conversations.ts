import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, shell } from 'electron'
import { parseEntries } from '@shared/sessions'
import { shorten } from '@shared/titleText'
import type { SessionEntry, SessionSummary } from '@shared/sessions'

const INDEX = 'index.json'

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

function textOf(content: unknown): string {
  if (typeof content === 'string') return content

  if (!Array.isArray(content)) return ''

  return content
    .map((block) => block as { type?: string; text?: string })
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join(' ')
}

function titleFrom(content: unknown): string {
  const text = textOf(content).trim()

  return text.length === 0 ? 'New chat' : shorten(text)
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

  writeIndex(
    readIndex().map((s) => (s.id === id ? { ...s, title: trimmed || s.title, named: true } : s))
  )
}

export function isNamed(id: string): boolean {
  return readIndex().find((session) => session.id === id)?.named === true
}

export function setTitle(id: string, title: string): boolean {
  const sessions = readIndex()
  const existing = sessions.find((session) => session.id === id)

  if (!existing || existing.named === true) return false

  existing.title = title
  existing.named = true
  writeIndex(sessions)

  return true
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
