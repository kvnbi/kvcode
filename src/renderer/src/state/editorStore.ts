import { create } from 'zustand'
import { isUnder } from '@renderer/lib/path'
import type { FileNode, Workspace } from '@shared/types'

interface EditorState {
  workspaces: Workspace[]
  entries: Record<string, FileNode[]>
  expanded: Record<string, boolean>
  pending: Record<string, boolean>
  activePath: string | null
  dirty: Record<string, boolean>
  isSaving: boolean
  openFolders: () => Promise<void>
  closeFolder: (root: string) => Promise<void>
  toggleDirectory: (path: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  setDirty: (path: string, value: boolean) => void
  save: () => Promise<void>
}

function fail(error: unknown): void {
  window.alert(error instanceof Error ? error.message : String(error))
}

function withoutSubtree<T>(record: Record<string, T>, root: string): Record<string, T> {
  const result: Record<string, T> = {}

  for (const [key, value] of Object.entries(record)) {
    if (!isUnder(root, key)) result[key] = value
  }

  return result
}

export const useEditorStore = create<EditorState>((set, get) => ({
  workspaces: [],
  entries: {},
  expanded: {},
  pending: {},
  activePath: null,
  dirty: {},
  isSaving: false,

  openFolders: async () => {
    try {
      const opened = await window.kvcode.openFolders()
      const open = new Set(get().workspaces.map((workspace) => workspace.path))
      const added = opened.filter((workspace) => !open.has(workspace.path))

      if (added.length === 0) return

      const listings = await Promise.all(
        added.map((workspace) => window.kvcode.readDirectory(workspace.path))
      )

      set((state) => {
        const entries = { ...state.entries }
        const expanded = { ...state.expanded }

        added.forEach((workspace, index) => {
          entries[workspace.path] = listings[index]
          expanded[workspace.path] = true
        })

        return { workspaces: [...state.workspaces, ...added], entries, expanded }
      })
    } catch (error) {
      fail(error)
    }
  },

  closeFolder: async (root) => {
    const { dirty } = get()
    const unsaved = Object.keys(dirty).filter((path) => dirty[path] && isUnder(root, path))

    if (unsaved.length > 0 && !window.confirm('Discard unsaved changes in this folder?')) {
      return
    }

    try {
      await window.kvcode.closeFolder(root)
    } catch (error) {
      fail(error)
      return
    }

    const { disposeBuffersUnder } = await import('@renderer/editor/buffers')
    disposeBuffersUnder(root)

    set((state) => ({
      workspaces: state.workspaces.filter((workspace) => workspace.path !== root),
      entries: withoutSubtree(state.entries, root),
      expanded: withoutSubtree(state.expanded, root),
      pending: withoutSubtree(state.pending, root),
      dirty: withoutSubtree(state.dirty, root),
      activePath: state.activePath && isUnder(root, state.activePath) ? null : state.activePath
    }))
  },

  toggleDirectory: async (path) => {
    const { expanded, entries, pending } = get()

    if (expanded[path]) {
      set({ expanded: { ...expanded, [path]: false } })
      return
    }

    set({ expanded: { ...expanded, [path]: true } })

    if (entries[path] || pending[path]) return

    set({ pending: { ...pending, [path]: true } })

    try {
      const children = await window.kvcode.readDirectory(path)
      set((state) => ({
        entries: { ...state.entries, [path]: children },
        pending: { ...state.pending, [path]: false }
      }))
    } catch (error) {
      set((state) => ({
        pending: { ...state.pending, [path]: false },
        expanded: { ...state.expanded, [path]: false }
      }))
      fail(error)
    }
  },

  openFile: async (path) => {
    if (get().activePath === path) return

    try {
      const { hasBuffer, openBuffer } = await import('@renderer/editor/buffers')

      if (!hasBuffer(path)) {
        const file = await window.kvcode.readFile(path)
        openBuffer(file.path, file.text)
      }

      set({ activePath: path })
    } catch (error) {
      fail(error)
    }
  },

  setDirty: (path, value) => {
    set((state) =>
      Boolean(state.dirty[path]) === value ? state : { dirty: { ...state.dirty, [path]: value } }
    )
  },

  save: async () => {
    const { activePath, isSaving, dirty } = get()

    if (!activePath || isSaving || !dirty[activePath]) return

    set({ isSaving: true })

    try {
      const { readBuffer, markSaved } = await import('@renderer/editor/buffers')
      const text = readBuffer(activePath)

      if (text === null) throw new Error('No open buffer for this file')

      await window.kvcode.writeFile(activePath, text)
      markSaved(activePath)

      set((state) => ({ isSaving: false, dirty: { ...state.dirty, [activePath]: false } }))
    } catch (error) {
      set({ isSaving: false })
      fail(error)
    }
  }
}))

export function selectIsDirty(state: EditorState): boolean {
  return state.activePath !== null && Boolean(state.dirty[state.activePath])
}
