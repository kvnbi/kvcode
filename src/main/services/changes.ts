import { BrowserWindow } from 'electron'
import { countChanges, diffFile } from '@shared/diff'
import type { DiffLine } from '@shared/diff'
import { IpcChannel } from '@shared/ipc'
import type { FileChange } from '@shared/changes'
import { writeTextFile } from './workspace'

const MAX_CHANGES = 50
const MAX_LINES = 600

interface Entry {
  id: string
  path: string
  before: string
  at: string
  reverted: boolean
  added: number
  removed: number
  lines: DiffLine[]
}

const entries: Entry[] = []

let counter = 0

function notify(): void {
  const window = BrowserWindow.getAllWindows()[0]

  if (window && !window.isDestroyed()) window.webContents.send(IpcChannel.ChangesUpdated)
}

function trim(lines: DiffLine[]): DiffLine[] {
  if (lines.length <= MAX_LINES) return lines

  const rest = lines.length - MAX_LINES

  return [...lines.slice(0, MAX_LINES), { kind: 'gap', text: '', before: 0, after: 0, count: rest }]
}

export function recordChange(path: string, before: string, after: string): void {
  if (before === after) return

  const lines = trim(diffFile(before, after))
  const { added, removed } = countChanges(lines)

  counter += 1
  entries.unshift({
    id: `c${counter}`,
    path,
    before,
    at: new Date().toISOString(),
    reverted: false,
    added,
    removed,
    lines
  })

  if (entries.length > MAX_CHANGES) entries.length = MAX_CHANGES

  notify()
}

export function listChanges(): FileChange[] {
  return entries.map((entry) => ({
    id: entry.id,
    path: entry.path,
    at: entry.at,
    added: entry.added,
    removed: entry.removed,
    reverted: entry.reverted,
    lines: entry.lines
  }))
}

export async function revertChange(id: string): Promise<string> {
  const entry = entries.find((item) => item.id === id)

  if (!entry) throw new Error('That change is no longer available')
  if (entry.reverted) return entry.path

  await writeTextFile(entry.path, entry.before)
  entry.reverted = true
  notify()

  return entry.path
}

export function clearChanges(): void {
  entries.length = 0
  notify()
}
