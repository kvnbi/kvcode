import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const PANELS = ['code', 'diff', 'output', 'browser', 'terminal'] as const

export type PanelId = (typeof PANELS)[number]

type Widths = Record<PanelId, number>
type Open = Record<PanelId, boolean>

const CHAT_MIN = 220
const CHAT_MAX = 560
const PANEL_MIN = 220
const PANEL_MAX = 720
const FLEX_MIN = 440
const DIVIDER = 1
const SIDEBAR = 240

interface LayoutState {
  chatWidth: number
  widths: Widths
  open: Open
  togglePanel: (id: PanelId) => void
  openPanel: (id: PanelId) => void
  resizeChat: (delta: number) => void
  resizePanel: (id: PanelId, delta: number) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function openPanels(open: Open): PanelId[] {
  return PANELS.filter((id) => open[id])
}

export function flexPanel(open: Open): PanelId | null {
  return open.code ? 'code' : null
}

export function fitLayout(
  chatWidth: number,
  widths: Widths,
  open: Open,
  viewport: number
): { chatWidth: number; widths: Widths } {
  const panels = openPanels(open)
  const flex = flexPanel(open)
  const fixed = panels.filter((id) => id !== flex)
  const slack = (value: number, min: number) => Math.max(0, value - min)

  const promptFlexes = flex === null
  const chatUsed = promptFlexes ? 0 : chatWidth
  const used = chatUsed + fixed.reduce((total, id) => total + widths[id], 0)
  const available = viewport - SIDEBAR - panels.length * DIVIDER - FLEX_MIN

  if (used <= available) return { chatWidth, widths }

  const chatSlack = promptFlexes ? 0 : slack(chatWidth, CHAT_MIN)
  const totalSlack = chatSlack + fixed.reduce((t, id) => t + slack(widths[id], PANEL_MIN), 0)

  if (totalSlack <= 0) return { chatWidth, widths }

  const ratio = Math.min(1, (used - available) / totalSlack)
  const fitted = { ...widths }

  for (const id of fixed) {
    fitted[id] = Math.round(widths[id] - slack(widths[id], PANEL_MIN) * ratio)
  }

  return { chatWidth: Math.round(chatWidth - chatSlack * ratio), widths: fitted }
}

const WRITE_DELAY = 250

let pendingWrite: string | null = null
let writeTimer: number | undefined

function flushWrite(): void {
  if (writeTimer !== undefined) {
    window.clearTimeout(writeTimer)
    writeTimer = undefined
  }

  if (pendingWrite === null) return

  const text = pendingWrite
  pendingWrite = null
  void window.kvcode.writeLayout(text)
}

function queueWrite(text: string): void {
  pendingWrite = text

  if (writeTimer !== undefined) window.clearTimeout(writeTimer)
  writeTimer = window.setTimeout(flushWrite, WRITE_DELAY)
}

window.addEventListener('pagehide', flushWrite)

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      chatWidth: 300,
      widths: { code: 640, diff: 300, output: 320, browser: 400, terminal: 300 },
      open: { code: false, diff: false, output: false, browser: false, terminal: false },
      togglePanel: (id) => set((state) => ({ open: { ...state.open, [id]: !state.open[id] } })),
      openPanel: (id) => set((state) => ({ open: { ...state.open, [id]: true } })),
      resizeChat: (delta) =>
        set((state) => ({ chatWidth: clamp(state.chatWidth + delta, CHAT_MIN, CHAT_MAX) })),
      resizePanel: (id, delta) =>
        set((state) => ({
          widths: { ...state.widths, [id]: clamp(state.widths[id] + delta, PANEL_MIN, PANEL_MAX) }
        }))
    }),
    {
      name: 'kvcode-layout',
      version: 1,
      migrate: (persisted) => {
        const state = { ...(persisted as Record<string, unknown>) }
        delete state.widths
        return state
      },
      storage: createJSONStorage(() => ({
        getItem: () => window.kvcode.readLayout(),
        setItem: (_name, value) => queueWrite(value),
        removeItem: () => queueWrite('')
      })),
      partialize: (state) => ({ chatWidth: state.chatWidth, widths: state.widths }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<LayoutState>),
        open: current.open
      })
    }
  )
)
