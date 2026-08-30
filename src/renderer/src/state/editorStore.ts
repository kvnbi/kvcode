import { create } from 'zustand'
import { dirname, isUnder } from '@renderer/lib/path'
import type { FileNode, Workspace } from '@shared/types'

interface EditorState {
  workspaces: Workspace[]
  openPaths: string[]
  entries: Record<string, FileNode[]>
  expanded: Record<string, boolean>
  pending: Record<string, boolean>
  activePath: string | null
  dirty: Record<string, boolean>
  isSaving: boolean
  openFolders: () => Promise<void>
  addWorkspaces: (opened: Workspace[]) => Promise<void>
  closeFolder: (root: string) => Promise<void>
  toggleDirectory: (path: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  closeFile: (path: string) => Promise<void>
  setDirty: (path: string, value: boolean) => void
  refreshFile: (path: string) => Promise<void>
  refreshDirectory: (path: string) => Promise<void>
  notifyChanged: (path: string) => Promise<void>
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
  openPaths: [],
  entries: {},
  expanded: {},
  pending: {},
  activePath: null,
  dirty: {},
  isSaving: false,

  openFolders: async () => {
    try {
      await get().addWorkspaces(await window.kvcode.openFolders())
    } catch (error) {
      fail(error)
    }
  },

  addWorkspaces: async (opened) => {
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
      openPaths: state.openPaths.filter((path) => !isUnder(root, path)),
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

      set((state) => ({
        activePath: path,
        openPaths: state.openPaths.includes(path) ? state.openPaths : [...state.openPaths, path]
      }))
    } catch (error) {
      fail(error)
    }
  },

  closeFile: async (path) => {
    if (get().dirty[path] && !window.confirm('Discard unsaved changes in this file?')) return

    const { disposeBuffer } = await import('@renderer/editor/buffers')
    disposeBuffer(path)

    set((state) => {
      const index = state.openPaths.indexOf(path)
      const openPaths = state.openPaths.filter((entry) => entry !== path)
      const dirty = { ...state.dirty }

      delete dirty[path]

      return {
        openPaths,
        dirty,
        activePath:
          state.activePath === path
            ? openPaths[Math.min(index, openPaths.length - 1)] ?? null
            : state.activePath
      }
    })

    const { dirty } = get()
    void window.kvcode.reportDirty(Object.keys(dirty).filter((key) => dirty[key]))
  },

  setDirty: (path, value) => {
    set((state) => {
      if (Boolean(state.dirty[path]) === value) return state

      const dirty = { ...state.dirty, [path]: value }
      void window.kvcode.reportDirty(Object.keys(dirty).filter((key) => dirty[key]))

      return { dirty }
    })
  },

  refreshDirectory: async (path) => {
    if (!get().entries[path]) return

    try {
      const children = await window.kvcode.readDirectory(path)
      set((state) => ({ entries: { ...state.entries, [path]: children } }))
    } catch {
      return
    }
  },

  notifyChanged: async (path) => {
    if (get().entries[path]) {
      await get().refreshDirectory(path)
      return
    }

    const { hasBuffer } = await import('@renderer/editor/buffers')

    if (hasBuffer(path)) await get().refreshFile(path)

    await get().refreshDirectory(dirname(path))
  },

  refreshFile: async (path) => {
    try {
      const file = await window.kvcode.readFile(path)
      const { applyExternalWrite, hasBuffer, openBuffer } = await import('@renderer/editor/buffers')

      if (hasBuffer(path)) applyExternalWrite(path, file.text)
      else openBuffer(path, file.text)

      get().setDirty(path, false)
    } catch (error) {
      fail(error)
    }
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
