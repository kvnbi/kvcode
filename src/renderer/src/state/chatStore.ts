import { create } from 'zustand'
import type { ChatEvent } from '@shared/chat'
import type { SessionEntry, SessionSummary } from '@shared/sessions'
import { useEditorStore } from './editorStore'
import { usePermissionStore } from './permissionStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'error'
  text: string
  tool?: string
}

interface ChatState {
  messages: ChatMessage[]
  sessions: SessionSummary[]
  activeId: string
  streaming: string
  isRunning: boolean
  send: (prompt: string) => Promise<void>
  cancel: () => Promise<void>
  refreshSessions: () => Promise<void>
  openSession: (id: string) => Promise<void>
  newSession: () => Promise<void>
  removeSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
}

let counter = 0

function nextId(): string {
  counter += 1
  return `m${counter}`
}

function append(role: ChatMessage['role'], text: string, tool?: string) {
  useChatStore.setState((state) => ({
    messages: [...state.messages, { id: nextId(), role, text, tool }]
  }))
}

function toMessages(entries: SessionEntry[]): ChatMessage[] {
  const messages: ChatMessage[] = []

  for (const entry of entries) {
    if (typeof entry.content === 'string') {
      messages.push({ id: nextId(), role: entry.role, text: entry.content })
      continue
    }

    if (!Array.isArray(entry.content)) continue

    for (const block of entry.content as { type: string; text?: string; name?: string; input?: unknown }[]) {
      if (block.type === 'text' && block.text) {
        messages.push({ id: nextId(), role: 'assistant', text: block.text })
      }

      if (block.type === 'tool_use') {
        messages.push({ id: nextId(), role: 'tool', text: JSON.stringify(block.input), tool: block.name })
      }
    }
  }

  return messages
}

async function stopTurn(): Promise<void> {
  usePermissionStore.getState().denyAll()
  await window.kvcode.cancelChat()
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessions: [],
  activeId: '',
  streaming: '',
  isRunning: false,

  send: async (prompt) => {
    if (get().isRunning || prompt.trim().length === 0) return

    append('user', prompt.trim())
    set({ isRunning: true, streaming: '' })

    try {
      await window.kvcode.sendChat(prompt.trim())
    } catch (error) {
      append('error', error instanceof Error ? error.message : String(error))
      set({ isRunning: false, streaming: '' })
    }

    await get().refreshSessions()
  },

  cancel: async () => {
    await window.kvcode.cancelChat()
    set({ isRunning: false, streaming: '' })
  },

  refreshSessions: async () => {
    set({ sessions: await window.kvcode.listSessions() })
  },

  openSession: async (id) => {
    await stopTurn()
    const entries = await window.kvcode.openSession(id)
    set({ messages: toMessages(entries), activeId: id, streaming: '', isRunning: false })
  },

  newSession: async () => {
    await stopTurn()
    await window.kvcode.createSession()
    set({ messages: [], activeId: '', streaming: '', isRunning: false })
  },

  removeSession: async (id) => {
    await window.kvcode.deleteSession(id)

    if (get().activeId === id) await get().newSession()

    await get().refreshSessions()
  },

  renameSession: async (id, title) => {
    await window.kvcode.renameSession(id, title)
    await get().refreshSessions()
  }
}))

function onEvent(event: ChatEvent): void {
  if (event.type === 'text') {
    useChatStore.setState((state) => ({ streaming: state.streaming + event.delta }))
    return
  }

  if (event.type === 'session') {
    useChatStore.setState({ activeId: event.id })
    void useChatStore.getState().refreshSessions()
    return
  }

  if (event.type === 'tool') {
    useChatStore.setState({ streaming: '' })
    append('tool', event.detail, event.name)
    return
  }

  if (event.type === 'file') {
    void useEditorStore.getState().notifyChanged(event.path)
    return
  }

  if (event.type === 'message') {
    useChatStore.setState({ streaming: '' })
    if (event.text.trim().length > 0) append('assistant', event.text)
    return
  }

  if (event.type === 'error') {
    useChatStore.setState({ streaming: '', isRunning: false })
    append('error', event.message)
    return
  }

  if (event.type === 'done') {
    useChatStore.setState({ isRunning: false, streaming: '' })
  }
}

window.kvcode.onChatEvent(onEvent)
void window.kvcode.resetChat()
void useChatStore.getState().refreshSessions()
