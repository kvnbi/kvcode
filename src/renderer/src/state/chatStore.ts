import { create } from 'zustand'
import type { ChatEvent } from '@shared/chat'
import { useEditorStore } from './editorStore'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'error'
  text: string
}

interface ChatState {
  messages: ChatMessage[]
  streaming: string
  isRunning: boolean
  send: (prompt: string) => Promise<void>
  cancel: () => Promise<void>
}

let counter = 0

function nextId(): string {
  counter += 1
  return `m${counter}`
}

function append(role: ChatMessage['role'], text: string) {
  useChatStore.setState((state) => ({
    messages: [...state.messages, { id: nextId(), role, text }]
  }))
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
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
  },

  cancel: async () => {
    await window.kvcode.cancelChat()
    set({ isRunning: false, streaming: '' })
  }
}))

function onEvent(event: ChatEvent): void {
  if (event.type === 'text') {
    useChatStore.setState((state) => ({ streaming: state.streaming + event.delta }))
    return
  }

  if (event.type === 'tool') {
    useChatStore.setState({ streaming: '' })
    append('tool', `${event.name} ${event.detail}`)
    return
  }

  if (event.type === 'file') {
    void useEditorStore.getState().refreshFile(event.path)
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
