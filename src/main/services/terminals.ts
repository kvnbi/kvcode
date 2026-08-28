import { homedir } from 'node:os'
import { BrowserWindow } from 'electron'
import { spawn } from 'node-pty'
import type { IPty } from 'node-pty'
import { IpcChannel } from '@shared/ipc'
import type { TerminalSnapshot } from '@shared/terminals'
import { listRoots } from './workspace'

const MAX_BUFFER = 200000
const COLS = 80
const ROWS = 24

interface Session {
  pty: IPty
  buffer: string
}

const sessions = new Map<string, Session>()

let counter = 0

function shellPath(): string {
  if (process.platform === 'win32') return process.env.COMSPEC ?? 'powershell.exe'

  return process.env.SHELL ?? '/bin/zsh'
}

const INHERITED = new Set([
  'HOME',
  'LANG',
  'LOGNAME',
  'PATH',
  'SHELL',
  'SSH_AUTH_SOCK',
  'TMPDIR',
  'TZ',
  'USER',
  '__CF_USER_TEXT_ENCODING'
])

function cleanPath(value: string): string {
  return value
    .split(':')
    .filter((entry) => !entry.includes('/node_modules/.bin'))
    .join(':')
}

function environment(): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue
    if (INHERITED.has(key) || key.startsWith('LC_')) result[key] = value
  }

  if (result.PATH) result.PATH = cleanPath(result.PATH)

  result.TERM = 'xterm-256color'
  result.COLORTERM = 'truecolor'
  result.TERM_PROGRAM = 'kvcode'

  return result
}

function emit(channel: string, payload: unknown): void {
  const window = BrowserWindow.getAllWindows()[0]

  if (window && !window.isDestroyed()) window.webContents.send(channel, payload)
}

export function createTerminal(): TerminalSnapshot {
  counter += 1

  const id = `t${counter}`
  const pty = spawn(shellPath(), process.platform === 'win32' ? [] : ['-l'], {
    name: 'xterm-256color',
    cols: COLS,
    rows: ROWS,
    cwd: listRoots()[0] ?? homedir(),
    env: environment()
  })

  const session: Session = { pty, buffer: '' }
  sessions.set(id, session)

  pty.onData((data) => {
    session.buffer = (session.buffer + data).slice(-MAX_BUFFER)
    emit(IpcChannel.TerminalData, { id, data })
  })

  pty.onExit(() => {
    sessions.delete(id)
    emit(IpcChannel.TerminalExit, { id })
  })

  return { id, buffer: '' }
}

export function openTerminals(): TerminalSnapshot[] {
  if (sessions.size === 0) createTerminal()

  return [...sessions.entries()].map(([id, session]) => ({ id, buffer: session.buffer }))
}

export function writeTerminal(id: string, data: string): void {
  sessions.get(id)?.pty.write(data)
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  if (cols <= 0 || rows <= 0) return

  const session = sessions.get(id)

  if (!session) return

  try {
    session.pty.resize(cols, rows)
  } catch {
    sessions.delete(id)
  }
}

export function closeTerminal(id: string): void {
  const session = sessions.get(id)

  if (!session) return

  sessions.delete(id)

  try {
    session.pty.kill()
  } catch {
    return
  }
}

export function disposeTerminals(): void {
  for (const id of [...sessions.keys()]) closeTerminal(id)
}
