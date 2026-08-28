import { create } from 'zustand'
import type { PermissionDecision, PermissionRequest } from '@shared/permissions'

interface PermissionState {
  queue: PermissionRequest[]
  decide: (decision: PermissionDecision) => void
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  queue: [],
  decide: (decision) => {
    const current = get().queue[0]

    if (!current) return

    void window.kvcode.replyPermission({ id: current.id, decision })
    set((state) => ({ queue: state.queue.slice(1) }))
  }
}))

window.kvcode.onPermissionRequest((request) => {
  usePermissionStore.setState((state) => ({ queue: [...state.queue, request] }))
})
