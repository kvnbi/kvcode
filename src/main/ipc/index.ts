import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { ChatEvent, ChatSettings } from '@shared/chat'
import type { PermissionReply } from '@shared/permissions'
import type { SessionEntry, SessionSummary } from '@shared/sessions'
import type { FileChange } from '@shared/changes'
import type { TerminalSnapshot } from '@shared/terminals'
import type { ProviderId } from '@shared/providers'
import type { FileContent, FileNode, IpcResult, Workspace } from '@shared/types'
import { cancelTurn, loadSession, resetSession, runTurn } from '../agent/session'
import { setDirtyPaths } from '../agent/tools'
import {
  deleteSession,
  listSessions,
  renameSession,
  readSession
} from '../services/conversations'
import { clearChanges, listChanges, revertChange } from '../services/changes'
import { settlePermission } from '../services/permissions'
import {
  closeTerminal,
  createTerminal,
  openTerminals,
  resizeTerminal,
  writeTerminal
} from '../services/terminals'
import { clearApiKey, secretsAvailable, storedProviders, writeApiKey } from '../services/secrets'
import { readLayout, readPreferences, writeLayout, writePreferences } from '../services/settings'
import {
  readDirectory,
  readTextFile,
  registerWorkspace,
  unregisterWorkspace,
  writeTextFile
} from '../services/workspace'

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function handle<T>(channel: string, run: (...args: never[]) => Promise<T>): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<IpcResult<T>> => {
    try {
      return { ok: true, value: await run(...(args as never[])) }
    } catch (error) {
      return { ok: false, error: toMessage(error) }
    }
  })
}

function settings(): ChatSettings {
  const preferences = readPreferences()

  return {
    mode: preferences.mode,
    provider: preferences.provider,
    storedKeys: storedProviders(),
    keychainAvailable: secretsAvailable()
  }
}

export function registerIpcHandlers(): void {
  handle<Workspace[]>(IpcChannel.OpenFolders, async () => {
    const window = BrowserWindow.getFocusedWindow()
    const options = { properties: ['openDirectory' as const, 'multiSelections' as const] }

    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled) {
      return []
    }

    return Promise.all(result.filePaths.map(registerWorkspace))
  })

  handle<null>(IpcChannel.CloseFolder, async (path: string) => {
    unregisterWorkspace(path)
    return null
  })

  handle<FileNode[]>(IpcChannel.ReadDirectory, (path: string) => readDirectory(path))
  handle<FileContent>(IpcChannel.ReadFile, (path: string) => readTextFile(path))
  handle<null>(IpcChannel.WriteFile, async (path: string, text: string) => {
    await writeTextFile(path, text)
    return null
  })

  handle<string | null>(IpcChannel.ReadLayout, async () => readLayout())

  handle<null>(IpcChannel.WriteLayout, async (text: string) => {
    writeLayout(text)
    return null
  })

  handle<ChatSettings>(IpcChannel.ReadSettings, async () => settings())

  handle<ChatSettings>(IpcChannel.WriteSettings, async (next: Partial<ChatSettings>) => {
    const patch: Parameters<typeof writePreferences>[0] = {}

    if (next.mode) patch.mode = next.mode
    if (next.provider) patch.provider = next.provider

    writePreferences(patch)
    return settings()
  })

  handle<ChatSettings>(IpcChannel.WriteApiKey, async (provider: ProviderId, value: string) => {
    writeApiKey(provider, value)
    return settings()
  })

  handle<ChatSettings>(IpcChannel.ClearApiKey, async (provider: ProviderId) => {
    clearApiKey(provider)
    return settings()
  })

  handle<null>(IpcChannel.ReportDirty, async (paths: string[]) => {
    setDirtyPaths(paths)
    return null
  })

  handle<null>(IpcChannel.PermissionReply, async (reply: PermissionReply) => {
    settlePermission(reply)
    return null
  })

  handle<null>(IpcChannel.ChatReset, async () => {
    resetSession()
    return null
  })

  handle<SessionSummary[]>(IpcChannel.SessionList, async () => listSessions())

  handle<SessionEntry[]>(IpcChannel.SessionOpen, async (id: string) => {
    loadSession(id)
    return readSession(id)
  })

  handle<null>(IpcChannel.SessionCreate, async () => {
    resetSession()
    return null
  })

  handle<null>(IpcChannel.SessionDelete, async (id: string) => {
    await deleteSession(id)
    return null
  })

  handle<null>(IpcChannel.SessionRename, async (id: string, title: string) => {
    renameSession(id, title)
    return null
  })

  handle<FileChange[]>(IpcChannel.ChangeList, async () => listChanges())

  handle<string>(IpcChannel.ChangeRevert, (id: string) => revertChange(id))

  handle<null>(IpcChannel.ChangeClear, async () => {
    clearChanges()
    return null
  })

  handle<TerminalSnapshot[]>(IpcChannel.TerminalOpen, async () => openTerminals())

  handle<TerminalSnapshot>(IpcChannel.TerminalCreate, async () => createTerminal())

  handle<null>(IpcChannel.TerminalWrite, async (id: string, data: string) => {
    writeTerminal(id, data)
    return null
  })

  handle<null>(IpcChannel.TerminalResize, async (id: string, cols: number, rows: number) => {
    resizeTerminal(id, cols, rows)
    return null
  })

  handle<null>(IpcChannel.TerminalClose, async (id: string) => {
    closeTerminal(id)
    return null
  })

  handle<null>(IpcChannel.ChatCancel, async () => {
    cancelTurn()
    return null
  })

  ipcMain.handle(IpcChannel.ChatSend, async (event, prompt: string) => {
    const send = (payload: ChatEvent) => {
      if (!event.sender.isDestroyed()) event.sender.send(IpcChannel.ChatEvent, payload)
    }

    await runTurn(prompt, send)
    return { ok: true, value: null }
  })
}
