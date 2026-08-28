import { contextBridge, ipcRenderer } from 'electron'
import type { ChatEvent, ChatSettings } from '@shared/chat'
import type { PermissionReply, PermissionRequest } from '@shared/permissions'
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
  reportDirty: (paths: string[]) => unwrap<null>(IpcChannel.ReportDirty, paths),
  onChatEvent: (handler: (event: ChatEvent) => void) => {
    const listener = (_event: unknown, payload: ChatEvent) => handler(payload)
    ipcRenderer.on(IpcChannel.ChatEvent, listener)
    return () => ipcRenderer.removeListener(IpcChannel.ChatEvent, listener)
  },
  replyPermission: (reply: PermissionReply) => unwrap<null>(IpcChannel.PermissionReply, reply),
  onPermissionRequest: (handler: (request: PermissionRequest) => void) => {
    const listener = (_event: unknown, payload: PermissionRequest) => handler(payload)
    ipcRenderer.on(IpcChannel.PermissionRequest, listener)
    return () => ipcRenderer.removeListener(IpcChannel.PermissionRequest, listener)
  }
}

export type KvcodeApi = typeof api

contextBridge.exposeInMainWorld('kvcode', api)
