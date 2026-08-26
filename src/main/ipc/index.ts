import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { FileContent, FileNode, IpcResult, Workspace } from '@shared/types'
import { readDirectory, readTextFile, registerWorkspace, writeTextFile } from '../services/workspace'

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

export function registerIpcHandlers(): void {
  handle<Workspace | null>(IpcChannel.OpenWorkspace, async () => {
    const window = BrowserWindow.getFocusedWindow()
    const options = { properties: ['openDirectory' as const] }

    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return registerWorkspace(result.filePaths[0])
  })

  handle<FileNode[]>(IpcChannel.ReadDirectory, (path: string) => readDirectory(path))
  handle<FileContent>(IpcChannel.ReadFile, (path: string) => readTextFile(path))
  handle<null>(IpcChannel.WriteFile, async (path: string, text: string) => {
    await writeTextFile(path, text)
    return null
  })
}
