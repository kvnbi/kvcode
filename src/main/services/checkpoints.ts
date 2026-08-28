import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { currentSession } from './conversations'

interface CheckpointFile {
  path: string
  existed: boolean
  backup: string | null
}

interface Checkpoint {
  id: string
  directory: string
  files: CheckpointFile[]
}

let active: Checkpoint | null = null

function root(): string {
  const session = currentSession()
  return join(app.getPath('userData'), 'checkpoints', session.project || 'no-project', session.id || 'no-session')
}

export function beginCheckpoint(): void {
  active = null
}

export async function captureFile(path: string): Promise<void> {
  if (active === null) {
    const id = new Date().toISOString().replace(/[:.]/g, '-')
    const directory = join(root(), id)
    mkdirSync(join(directory, 'files'), { recursive: true, mode: 0o700 })
    active = { id, directory, files: [] }
  }

  if (active.files.some((file) => file.path === path)) return

  const original = await readFile(path, 'utf8').catch(() => null)
  const entry: CheckpointFile = { path, existed: original !== null, backup: null }

  if (original !== null) {
    entry.backup = join('files', String(active.files.length))
    const target = join(active.directory, entry.backup)
    writeFileSync(target, original, { encoding: 'utf8', mode: 0o600 })
    chmodSync(target, 0o600)
  }

  active.files.push(entry)

  const manifest = join(active.directory, 'manifest.json')
  writeFileSync(manifest, JSON.stringify({ id: active.id, files: active.files }, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  })
  chmodSync(manifest, 0o600)
}
