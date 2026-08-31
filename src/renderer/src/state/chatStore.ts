import { create } from 'zustand'
import type { ChatEvent } from '@shared/chat'
import type { SessionEntry, SessionSummary } from '@shared/sessions'
import { useEditorStore } from './editorStore'
import { usePermissionStore } from './permissionStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'result' | 'thinking' | 'error'
  text: string
  tool?: string
}

interface ChatState {
  messages: ChatMessage[]
  sessions: SessionSummary[]
  activeId: string
  streaming: string
  isRunning: boolean
  usage: { tokens: number; limit: number } | null
  send: (prompt: string) => Promise<void>
  cancel: () => Promise<void>
  refreshSessions: () => Promise<void>
  refreshUsage: () => Promise<void>
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

interface StoredBlock {
  type: string
  text?: string
  thinking?: string
  name?: string
  input?: unknown
  content?: unknown
  is_error?: boolean
}

const RESULT_LIMIT = 2000

function resultText(content: unknown): string {
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        const part = block as StoredBlock
        if (typeof part?.text === 'string') return part.text
        if (part?.type === 'image') return '[image]'
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

function clamp(text: string): string {
  return text.length > RESULT_LIMIT ? `${text.slice(0, RESULT_LIMIT)}...` : text
}

function toMessages(entries: SessionEntry[]): ChatMessage[] {
  const messages: ChatMessage[] = []
  const names = new Map<string, string>()

  for (const entry of entries) {
    if (typeof entry.content === 'string') {
      messages.push({ id: nextId(), role: entry.role, text: entry.content })
      continue
    }

    if (!Array.isArray(entry.content)) continue

    for (const block of entry.content as StoredBlock[]) {
      if (block.type === 'text' && block.text) {
        messages.push({ id: nextId(), role: 'assistant', text: block.text })
        continue
      }

      if (block.type === 'thinking' && block.thinking) {
        messages.push({ id: nextId(), role: 'thinking', text: block.thinking })
        continue
      }

      if (block.type === 'tool_use') {
        const id = (block as { id?: string }).id
        if (id && block.name) names.set(id, block.name)
        messages.push({ id: nextId(), role: 'tool', text: JSON.stringify(block.input), tool: block.name })
        continue
      }

      if (block.type === 'tool_result') {
        const text = clamp(resultText(block.content).trim())
        if (text.length === 0) continue

        const id = (block as { tool_use_id?: string }).tool_use_id
        messages.push({
          id: nextId(),
          role: block.is_error === true ? 'error' : 'result',
          text,
          tool: id ? names.get(id) : undefined
        })
      }
    }
  }

  return messages
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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
  usage: null,

  send: async (prompt) => {
    if (get().isRunning || prompt.trim().length === 0) return

    append('user', prompt.trim())
    set({ isRunning: true, streaming: '' })

    try {
      await window.kvcode.sendChat(prompt.trim())
    } catch (error) {
      append('error', reason(error))
      set({ isRunning: false, streaming: '' })
    }

    await get().refreshSessions()
  },

  cancel: async () => {
    await window.kvcode.cancelChat()
    set({ isRunning: false, streaming: '' })
  },

  refreshUsage: async () => {
    try {
      set({ usage: await window.kvcode.chatUsage() })
    } catch {
      set({ usage: null })
    }
  },

  refreshSessions: async () => {
    try {
      set({ sessions: await window.kvcode.listSessions() })
    } catch {
      set({ sessions: [] })
    }
  },

  openSession: async (id) => {
    try {
      await stopTurn()
      const entries = await window.kvcode.openSession(id)
      set({ messages: toMessages(entries), activeId: id, streaming: '', isRunning: false })
      await get().refreshUsage()
    } catch (error) {
      set({ messages: [], activeId: '', streaming: '', isRunning: false })
      append('error', `Could not open that chat. ${reason(error)}`)
    }
  },

  newSession: async () => {
    try {
      await stopTurn()
      await window.kvcode.createSession()
      set({ messages: [], activeId: '', streaming: '', isRunning: false })
      await get().refreshUsage()
    } catch (error) {
      append('error', `Could not start a new chat. ${reason(error)}`)
    }
  },

  removeSession: async (id) => {
    try {
      await window.kvcode.deleteSession(id)

      if (get().activeId === id) await get().newSession()
    } catch (error) {
      append('error', `Could not delete that chat. ${reason(error)}`)
    }

    await get().refreshSessions()
  },

  renameSession: async (id, title) => {
    try {
      await window.kvcode.renameSession(id, title)
    } catch (error) {
      append('error', `Could not rename that chat. ${reason(error)}`)
    }

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

  if (event.type === 'usage') {
    useChatStore.setState({ usage: { tokens: event.tokens, limit: event.limit } })
    return
  }

  if (event.type === 'compacted') {
    append('tool', `compacted to about ${Math.round(event.tokens / 1000)}k tokens`, 'context')
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
void window.kvcode.resetChat().then(() => useChatStore.getState().refreshUsage())
void useChatStore.getState().refreshSessions()
