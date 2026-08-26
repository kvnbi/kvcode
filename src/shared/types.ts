export interface FileNode {
  name: string
  path: string
  kind: 'file' | 'directory'
}

export interface Workspace {
  name: string
  path: string
}

export interface FileContent {
  path: string
  text: string
}

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string }
