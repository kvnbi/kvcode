import { BrowserWindow } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { PermissionKind, PermissionReply, PermissionRequest } from '@shared/permissions'

const pending = new Map<string, (reply: PermissionReply) => void>()
const readGrants = new Set<string>()
const writeGrants = new Set<string>()
const commandGrants = new Set<string>()

let counter = 0

function covers(grants: Set<string>, target: string): boolean {
  for (const granted of grants) {
    if (target === granted || target.startsWith(`${granted}/`)) return true
  }

  return false
}

export function isPathGranted(target: string, kind: PermissionKind): boolean {
  if (kind === 'write') return covers(writeGrants, target)

  return covers(readGrants, target) || covers(writeGrants, target)
}

export function isCommandGranted(command: string): boolean {
  return commandGrants.has(command.trim())
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
  const request: PermissionRequest = { id: `p${counter}`, kind, detail, scope, cwd }

  const reply = await new Promise<PermissionReply>((resolve) => {
    pending.set(request.id, resolve)
    window.webContents.send(IpcChannel.PermissionRequest, request)
  })

  if (reply.decision === 'deny') return false

  if (reply.decision === 'session') {
    if (kind === 'command') commandGrants.add(detail.trim())
    else if (kind === 'write') writeGrants.add(scope)
    else readGrants.add(scope)
  }

  return true
}
