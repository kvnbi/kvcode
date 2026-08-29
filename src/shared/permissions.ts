export type PermissionKind = 'read' | 'write' | 'command'

export interface PermissionRequest {
  id: string
  kind: PermissionKind
  detail: string
  scope: string
  cwd: string
}

export type PermissionDecision = 'once' | 'session' | 'deny'

export interface PermissionReply {
  id: string
  decision: PermissionDecision
}

const RISKY = [
  'rm -rf',
  'rm -r',
  'sudo',
  'mkfs',
  'dd if=',
  'chmod 777',
  'curl',
  'wget',
  '.ssh',
  'shutdown',
  'launchctl',
  'defaults write'
]

export function looksRisky(detail: string): boolean {
  const value = detail.toLowerCase()
  return RISKY.some((pattern) => value.includes(pattern))
}
