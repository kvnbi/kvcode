import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { TERMINAL_THEME } from './theme'

const FALLBACK_FONT = 'Menlo, monospace'

interface Slot {
  term: Terminal
  fit: FitAddon
  host: HTMLDivElement
}

const slots = new Map<string, Slot>()

function fontFamily(): string {
  const token = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()
  return token || FALLBACK_FONT
}

export function openSlot(id: string, container: HTMLElement): Slot {
  const existing = slots.get(id)

  if (existing) return existing

  const host = document.createElement('div')
  host.style.position = 'absolute'
  host.style.inset = '0'
  container.appendChild(host)

  const term = new Terminal({
    cursorBlink: true,
    fontFamily: fontFamily(),
    fontSize: 13,
    lineHeight: 1.35,
    scrollback: 10000,
    theme: TERMINAL_THEME
  })

  const fit = new FitAddon()
  term.loadAddon(fit)
  term.open(host)
  term.onData((data) => void window.kvcode.writeTerminal(id, data))
  term.onResize(({ cols, rows }) => void window.kvcode.resizeTerminal(id, cols, rows))

  const slot = { term, fit, host }
  slots.set(id, slot)

  return slot
}

export function hasSlot(id: string): boolean {
  return slots.has(id)
}

export function writeSlot(id: string, data: string): void {
  slots.get(id)?.term.write(data)
}

export function showSlot(id: string, visible: boolean): void {
  const slot = slots.get(id)

  if (!slot) return

  slot.host.style.display = visible ? 'block' : 'none'

  if (visible) fitSlot(id)
}

export function fitSlot(id: string): void {
  const slot = slots.get(id)

  if (!slot || slot.host.style.display === 'none') return

  try {
    slot.fit.fit()
  } catch {
    return
  }
}

export function focusSlot(id: string): void {
  slots.get(id)?.term.focus()
}

export function disposeSlot(id: string): void {
  const slot = slots.get(id)

  if (!slot) return

  slots.delete(id)
  slot.term.dispose()
  slot.host.remove()
}

export function disposeAllSlots(): void {
  for (const id of [...slots.keys()]) disposeSlot(id)
}
