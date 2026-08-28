import { BrowserWindow } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { PermissionKind, PermissionReply, PermissionRequest } from '@shared/permissions'

const pending = new Map<string, (reply: PermissionReply) => void>()
const grantedPaths = new Set<string>()

let grantedCommands = false
let counter = 0

export function isPathGranted(target: string): boolean {
  for (const granted of grantedPaths) {
    if (target === granted || target.startsWith(`${granted}/`)) return true
  }

  return false
}

export function commandsGranted(): boolean {
  return grantedCommands
}

export function settlePermission(reply: PermissionReply): void {
  const resolve = pending.get(reply.id)

  if (!resolve) return

  pending.delete(reply.id)
  resolve(reply)
}

export async function requestPermission(
  kind: PermissionKind,
  detail: string,
  scope: string,
  cwd = ''
): Promise<boolean> {
  const window = BrowserWindow.getAllWindows()[0]

  if (!window || window.isDestroyed()) return false

  counter += 1
  const request: PermissionRequest = { id: `p${counter}`, kind, detail, cwd }

  const reply = await new Promise<PermissionReply>((resolve) => {
    pending.set(request.id, resolve)
    window.webContents.send(IpcChannel.PermissionRequest, request)
  })

  if (reply.decision === 'deny') return false

  if (reply.decision === 'session') {
    if (kind === 'command') grantedCommands = true
    else grantedPaths.add(scope)
  }

  return true
}
