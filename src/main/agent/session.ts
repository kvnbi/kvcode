import { homedir } from 'node:os'
import { contextWindow } from '@shared/models'
import type Anthropic from '@anthropic-ai/sdk'
import type { ChatEvent } from '@shared/chat'
import {
  appendEntry,
  currentSession,
  openSession,
  recordUsage,
  sessionTokens,
  startSession
} from '../services/conversations'
import { AGENT_TOOLS, WRITING_TOOLS, runTool } from './tools'
import { listRoots } from '../services/workspace'
import {
  charsFor,
  estimateText,
  estimateTokens,
  pruneHistory,
  safeCutIndex,
  summaryPrompt,
  trimToBudget,
  withSummary
} from './compaction'
import type { ActiveModel } from './transport'
import { createTransport } from './transport'

const MAX_TOKENS = 64000
const MAX_STEPS = 40
const COMPACT_AT = 0.7
const SUMMARY_INPUT = 0.5
const MIN_BUDGET = 1000
const SUMMARY_TOKENS = 2000
const CONTEXT_ERRORS = ['context length', 'context_length', 'too long', 'maximum context', 'prompt is too long']

const SYSTEM = [
  'You are the coding assistant inside kvcode, a desktop editor.',
  `You can reach any file or folder on this computer. The home directory is ${homedir()}.`,
  'Paths outside the folders the user has opened are allowed, and the user is asked to approve them.',
  'Never refuse because no folder is open. Resolve the location the user named to an absolute path and use it.',
  'Use find_files and search_text to locate code, and read_file before answering.',
  'Edit existing files with edit_file, replacing only the lines that change. Use write_file only for new files.'
].join(' ')

const history: Anthropic.MessageParam[] = []

let controller: AbortController | null = null
let baseline = 0

export function resetSession(): void {
  history.length = 0
  startSession()
}

export function loadSession(id: string): void {
  const entries = openSession(id)
  const marker = entries.map((entry) => entry.compacted === true).lastIndexOf(true)

  history.length = 0

  for (const entry of entries.slice(marker === -1 ? 0 : marker)) {
    history.push({ role: entry.role, content: entry.content } as Anthropic.MessageParam)
  }
}

function overhead(): number {
  if (baseline === 0) baseline = estimateText(SYSTEM) + estimateText(JSON.stringify(AGENT_TOOLS))

  return baseline
}

export function sessionUsage(): number {
  if (history.length === 0) return 0

  const stored = sessionTokens()

  return stored > 0 ? stored : overhead() + estimateTokens(history)
}

export function cancelTurn(): void {
  controller?.abort()
  controller = null
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function record(role: 'user' | 'assistant', content: unknown, compacted = false): void {
  appendEntry({ role, content, at: new Date().toISOString(), compacted })
}

function overLimit(message: string): boolean {
  const value = message.toLowerCase()

  return CONTEXT_ERRORS.some((hint) => value.includes(hint))
}

async function summarise(
  active: ActiveModel,
  older: Anthropic.MessageParam[],
  inputBudget: number
): Promise<string> {
  const stream = active.transport.stream({
    model: active.model,
    system: 'You write compact notes that let another assistant continue a conversation.',
    messages: [{ role: 'user', content: summaryPrompt(older, charsFor(inputBudget)) }],
    tools: [],
    maxTokens: SUMMARY_TOKENS,
    signal: new AbortController().signal
  })

  return textOf(await stream.finalMessage())
}

async function compact(active: ActiveModel, emit: (event: ChatEvent) => void): Promise<void> {
  const window = contextWindow(active.model)
  const budget = Math.max(MIN_BUDGET, Math.floor(window * COMPACT_AT) - overhead())
  const before = estimateTokens(history)

  if (before <= budget) return

  history.splice(0, history.length, ...pruneHistory(history))

  if (estimateTokens(history) > budget) {
    const cut = safeCutIndex(history)

    if (cut > 0) {
      const older = history.slice(0, cut)
      const recent = history.slice(cut)
      const summary = await summarise(active, older, Math.floor(window * SUMMARY_INPUT))

      history.splice(0, history.length, ...withSummary(summary, recent))
      record('user', `Summary of earlier conversation:\n${summary}`, true)

      for (const message of recent) {
        if (message.role === 'user' || message.role === 'assistant') record(message.role, message.content)
      }
    }
  }

  if (estimateTokens(history) > budget) {
    history.splice(0, history.length, ...trimToBudget(history, budget))
  }

  const after = estimateTokens(history)

  if (after < before) emit({ type: 'compacted', tokens: after })
}

async function resolveCalls(
  calls: Anthropic.ToolUseBlock[],
  emit: (event: ChatEvent) => void
): Promise<Anthropic.ToolResultBlockParam[]> {
  const results: Anthropic.ToolResultBlockParam[] = []

  for (const call of calls) {
    emit({ type: 'tool', name: call.name, detail: JSON.stringify(call.input) })

    try {
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: await runTool(call.name, call.input)
      })

      const input = call.input as { path?: string; cwd?: string }

      if (WRITING_TOOLS.has(call.name)) {
        if (input.path) emit({ type: 'file', path: input.path })
      }

      if (call.name === 'run_command') {
        const where = input.cwd ?? listRoots()[0]

        if (where) emit({ type: 'file', path: where })
      }
    } catch (error) {
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: error instanceof Error ? error.message : String(error),
        is_error: true
      })
    }
  }

  return results
}

async function attempt(active: ActiveModel, emit: (event: ChatEvent) => void): Promise<boolean> {
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const stream = active.transport.stream({
      model: active.model,
      system: SYSTEM,
      messages: history,
      tools: AGENT_TOOLS,
      maxTokens: MAX_TOKENS,
      signal: controller?.signal ?? new AbortController().signal
    })

    stream.onText((delta) => emit({ type: 'text', delta }))

    const message = await stream.finalMessage()

    const used = message.usage.input_tokens || overhead() + estimateTokens(history)

    recordUsage(used)
    emit({ type: 'usage', tokens: used })

    history.push({ role: 'assistant', content: message.content })
    record('assistant', message.content)

    if (message.stop_reason !== 'tool_use') {
      emit({ type: 'message', text: textOf(message) })
      return true
    }

    const calls = message.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )
    const results = await resolveCalls(calls, emit)

    history.push({ role: 'user', content: results })
    record('user', results)
  }

  return false
}

export async function runTurn(prompt: string, emit: (event: ChatEvent) => void): Promise<void> {
  emit({ type: 'start' })

  try {
    const active = createTransport()

    if (!currentSession()) startSession()

    controller = new AbortController()
    await compact(active, emit)
    history.push({ role: 'user', content: prompt })
    record('user', prompt)
    emit({ type: 'session', id: currentSession() })

    let finished = false

    try {
      finished = await attempt(active, emit)
    } catch (error) {
      if (!overLimit(error instanceof Error ? error.message : String(error))) throw error

      emit({ type: 'text', delta: '' })
      await compact(active, emit)
      finished = await attempt(active, emit)
    }

    if (!finished) {
      emit({ type: 'error', message: 'The assistant used too many steps without finishing' })
      return
    }

    emit({ type: 'done' })
  } catch (error) {
    emit({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    controller = null
  }
}
