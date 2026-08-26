import { contextBridge, ipcRenderer } from 'electron'
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
  openWorkspace: () => unwrap<Workspace | null>(IpcChannel.OpenWorkspace),
  readDirectory: (path: string) => unwrap<FileNode[]>(IpcChannel.ReadDirectory, path),
  readFile: (path: string) => unwrap<FileContent>(IpcChannel.ReadFile, path),
  writeFile: (path: string, text: string) => unwrap<null>(IpcChannel.WriteFile, path, text)
}

export type KvcodeApi = typeof api

contextBridge.exposeInMainWorld('kvcode', api)
