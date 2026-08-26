import { create } from 'zustand'
import type { FileNode, Workspace } from '@shared/types'

interface Status {
  kind: 'idle' | 'info' | 'error'
  message: string
}

interface EditorState {
  workspace: Workspace | null
  entries: Record<string, FileNode[]>
  expanded: Record<string, boolean>
  pending: Record<string, boolean>
  activePath: string | null
  dirty: Record<string, boolean>
  isSaving: boolean
  status: Status
  openWorkspace: () => Promise<void>
  toggleDirectory: (path: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  setDirty: (path: string, value: boolean) => void
  save: () => Promise<void>
}

const IDLE: Status = { kind: 'idle', message: '' }
const FLASH_MS = 2400

let flashTimer: number | undefined

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useEditorStore = create<EditorState>((set, get) => {
  function flash(status: Status) {
    window.clearTimeout(flashTimer)
    set({ status })
    flashTimer = window.setTimeout(() => set({ status: IDLE }), FLASH_MS)
  }

  function fail(error: unknown) {
    window.clearTimeout(flashTimer)
    set({ status: { kind: 'error', message: toMessage(error) } })
  }

  return {
    workspace: null,
    entries: {},
    expanded: {},
    pending: {},
    activePath: null,
    dirty: {},
    isSaving: false,
    status: IDLE,

    openWorkspace: async () => {
      try {
        const workspace = await window.kvcode.openWorkspace()

        if (!workspace) return

        const entries = await window.kvcode.readDirectory(workspace.path)
        const { disposeBuffers } = await import('@renderer/editor/buffers')
        disposeBuffers()

        window.clearTimeout(flashTimer)
        set({
          workspace,
          entries: { [workspace.path]: entries },
          expanded: { [workspace.path]: true },
          pending: {},
          activePath: null,
          dirty: {},
          status: IDLE
        })
      } catch (error) {
        fail(error)
      }
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
        flash({ kind: 'info', message: 'Written to disk' })
      } catch (error) {
        set({ isSaving: false })
        fail(error)
      }
    }
  }
})

export function selectIsDirty(state: EditorState): boolean {
  return state.activePath !== null && Boolean(state.dirty[state.activePath])
}
