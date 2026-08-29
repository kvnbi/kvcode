import { contextBridge, ipcRenderer } from 'electron'
import type { ChatEvent, ChatSettings } from '@shared/chat'
import type { PermissionReply, PermissionRequest } from '@shared/permissions'
import type { SessionEntry, SessionSummary } from '@shared/sessions'
import type { TerminalChunk, TerminalSnapshot } from '@shared/terminals'
import type { ProviderId } from '@shared/providers'
import { IpcChannel } from '@shared/ipc'
import type { FileContent, FileNode, IpcResult, Workspace } from '@shared/types'

async function unwrap<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>

  if (!result.ok) {
    throw new Error(result.error)
  }

  return result.value
}

const api = {
  platform: process.platform,
  openFolders: () => unwrap<Workspace[]>(IpcChannel.OpenFolders),
  closeFolder: (path: string) => unwrap<null>(IpcChannel.CloseFolder, path),
  onWorkspaceOpened: (handler: (workspace: Workspace) => void) => {
    const listener = (_event: unknown, payload: Workspace) => handler(payload)
    ipcRenderer.on(IpcChannel.WorkspaceOpened, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannel.WorkspaceOpened, listener)
    }
  },
  readDirectory: (path: string) => unwrap<FileNode[]>(IpcChannel.ReadDirectory, path),
  readFile: (path: string) => unwrap<FileContent>(IpcChannel.ReadFile, path),
  writeFile: (path: string, text: string) => unwrap<null>(IpcChannel.WriteFile, path, text),
  readLayout: () => unwrap<string | null>(IpcChannel.ReadLayout),
  writeLayout: (text: string) => unwrap<null>(IpcChannel.WriteLayout, text),
  readSettings: () => unwrap<ChatSettings>(IpcChannel.ReadSettings),
  writeSettings: (next: Partial<ChatSettings>) => unwrap<ChatSettings>(IpcChannel.WriteSettings, next),
  writeApiKey: (provider: ProviderId, value: string) =>
    unwrap<ChatSettings>(IpcChannel.WriteApiKey, provider, value),
  clearApiKey: (provider: ProviderId) => unwrap<ChatSettings>(IpcChannel.ClearApiKey, provider),
  sendChat: (prompt: string) => unwrap<null>(IpcChannel.ChatSend, prompt),
  cancelChat: () => unwrap<null>(IpcChannel.ChatCancel),
  resetChat: () => unwrap<null>(IpcChannel.ChatReset),
  listSessions: () => unwrap<SessionSummary[]>(IpcChannel.SessionList),
  openSession: (id: string) => unwrap<SessionEntry[]>(IpcChannel.SessionOpen, id),
  createSession: () => unwrap<null>(IpcChannel.SessionCreate),
  deleteSession: (id: string) => unwrap<null>(IpcChannel.SessionDelete, id),
  renameSession: (id: string, title: string) => unwrap<null>(IpcChannel.SessionRename, id, title),
  reportDirty: (paths: string[]) => unwrap<null>(IpcChannel.ReportDirty, paths),
  onChatEvent: (handler: (event: ChatEvent) => void) => {
    const listener = (_event: unknown, payload: ChatEvent) => handler(payload)
    ipcRenderer.on(IpcChannel.ChatEvent, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannel.ChatEvent, listener)
    }
  },
  openTerminals: () => unwrap<TerminalSnapshot[]>(IpcChannel.TerminalOpen),
  createTerminal: () => unwrap<TerminalSnapshot>(IpcChannel.TerminalCreate),
  writeTerminal: (id: string, data: string) => unwrap<null>(IpcChannel.TerminalWrite, id, data),
  resizeTerminal: (id: string, cols: number, rows: number) =>
    unwrap<null>(IpcChannel.TerminalResize, id, cols, rows),
  closeTerminal: (id: string) => unwrap<null>(IpcChannel.TerminalClose, id),
  onTerminalData: (handler: (chunk: TerminalChunk) => void) => {
    const listener = (_event: unknown, payload: TerminalChunk) => handler(payload)
    ipcRenderer.on(IpcChannel.TerminalData, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannel.TerminalData, listener)
    }
  },
  onTerminalExit: (handler: (id: string) => void) => {
    const listener = (_event: unknown, payload: { id: string }) => handler(payload.id)
    ipcRenderer.on(IpcChannel.TerminalExit, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannel.TerminalExit, listener)
    }
  },
  replyPermission: (reply: PermissionReply) => unwrap<null>(IpcChannel.PermissionReply, reply),
  onPermissionRequest: (handler: (request: PermissionRequest) => void) => {
    const listener = (_event: unknown, payload: PermissionRequest) => handler(payload)
    ipcRenderer.on(IpcChannel.PermissionRequest, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannel.PermissionRequest, listener)
    }
  }
}

export type KvcodeApi = typeof api

contextBridge.exposeInMainWorld('kvcode', api)
