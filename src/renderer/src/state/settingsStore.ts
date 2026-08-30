import { create } from 'zustand'
import type { ChatSettings } from '@shared/chat'
import type { ProviderId } from '@shared/providers'

interface SettingsState {
  settings: ChatSettings | null
  models: string[]
  load: () => Promise<void>
  update: (patch: Partial<ChatSettings>) => Promise<void>
  saveKey: (provider: ProviderId, value: string) => Promise<void>
  clearKey: (provider: ProviderId) => Promise<void>
}

async function withModels(settings: ChatSettings, set: (partial: Partial<SettingsState>) => void) {
  set({ settings })
  set({ models: await window.kvcode.listModels(settings.provider) })
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  models: [],

  load: async () => {
    if (get().settings) return

    await withModels(await window.kvcode.readSettings(), set)
  },

  update: async (patch) => {
    await withModels(await window.kvcode.writeSettings(patch), set)
  },

  saveKey: async (provider, value) => {
    await withModels(await window.kvcode.writeApiKey(provider, value), set)
  },

  clearKey: async (provider) => {
    await withModels(await window.kvcode.clearApiKey(provider), set)
  }
}))
