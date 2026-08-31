import { test } from 'node:test'
import assert from 'node:assert/strict'
import type Anthropic from '@anthropic-ai/sdk'
import { estimateText, estimateTokens, isTurnStart, pruneHistory, safeCutIndex, withSummary } from './compaction.ts'

type Message = Anthropic.MessageParam

const userTurn = (text: string): Message => ({ role: 'user', content: text })
const assistantCall = (id: string): Message => ({
  role: 'assistant',
  content: [{ type: 'tool_use', id, name: 'read_file', input: {} }] as Anthropic.ContentBlockParam[]
})
const toolResult = (id: string, text: string): Message => ({
  role: 'user',
  content: [{ type: 'tool_result', tool_use_id: id, content: text }] as Anthropic.ContentBlockParam[]
})

const conversation: Message[] = [
  userTurn('first question'),
  assistantCall('a'),
  toolResult('a', 'x'.repeat(5000)),
  { role: 'assistant', content: 'first answer' },
  userTurn('second question'),
  assistantCall('b'),
  toolResult('b', 'y'.repeat(5000)),
  { role: 'assistant', content: 'second answer' }
]

test('a real user message starts a turn', () => {
  assert.equal(isTurnStart(userTurn('hi')), true)
})

test('a tool result does not start a turn', () => {
  assert.equal(isTurnStart(toolResult('a', 'out')), false)
})

test('an assistant message does not start a turn', () => {
  assert.equal(isTurnStart(assistantCall('a')), false)
})

test('the cut lands on a turn boundary', () => {
  const at = safeCutIndex(conversation, 4)
  assert.ok(isTurnStart(conversation[at]))
})

test('a cut never orphans a tool result', () => {
  for (let keep = 1; keep <= conversation.length; keep += 1) {
    const at = safeCutIndex(conversation, keep)
    const tail = conversation.slice(at)
    const opened = new Set<string>()

    for (const message of tail) {
      if (typeof message.content === 'string') continue

      for (const block of message.content) {
        if (block.type === 'tool_use') opened.add(block.id)
        if (block.type === 'tool_result') {
          assert.ok(opened.has(block.tool_use_id), `orphan at keep ${keep}`)
        }
      }
    }
  }
})

test('a cut never orphans a tool call', () => {
  for (let keep = 1; keep <= conversation.length; keep += 1) {
    const tail = conversation.slice(safeCutIndex(conversation, keep))
    const answered = new Set<string>()

    for (const message of tail) {
      if (typeof message.content === 'string') continue
      for (const block of message.content) {
        if (block.type === 'tool_result') answered.add(block.tool_use_id)
      }
    }

    for (const message of tail) {
      if (typeof message.content === 'string') continue
      for (const block of message.content) {
        if (block.type === 'tool_use') assert.ok(answered.has(block.id), `unanswered at keep ${keep}`)
      }
    }
  }
})

test('cutting an empty history is safe', () => {
  assert.equal(safeCutIndex([], 6), 0)
})

test('pruning shrinks old tool results', () => {
  const before = estimateTokens(conversation)
  const after = estimateTokens(pruneHistory(conversation, 1))
  assert.ok(after < before / 2, `${after} should be far below ${before}`)
})

test('pruning preserves anything inside the recent window', () => {
  const before = estimateTokens(conversation)
  const after = estimateTokens(pruneHistory(conversation, 2))
  assert.ok(after > before / 2, 'the newest tool result should survive')
})

test('pruning leaves recent messages untouched', () => {
  const pruned = pruneHistory(conversation, 2)
  assert.deepEqual(pruned.slice(-2), conversation.slice(-2))
})

test('pruning marks what it removed', () => {
  const pruned = pruneHistory(conversation, 2)
  assert.match(JSON.stringify(pruned), /trimmed \d+ characters/)
})

test('pruning keeps the message count', () => {
  assert.equal(pruneHistory(conversation, 2).length, conversation.length)
})

test('pruning never touches text messages', () => {
  const pruned = pruneHistory(conversation, 0)
  assert.equal(pruned[0].content, 'first question')
})

test('a summary is prepended as a user message', () => {
  const out = withSummary('notes', [userTurn('latest')])
  assert.equal(out.length, 2)
  assert.equal(out[0].role, 'user')
  assert.match(String(out[0].content), /Summary of earlier conversation/)
})

test('token estimates grow with content', () => {
  assert.ok(estimateTokens(conversation) > estimateTokens([userTurn('hi')]))
})

test('an empty history estimates zero tokens', () => {
  assert.equal(estimateTokens([]), 0)
})

test('estimateText scales with length', () => {
  assert.equal(estimateText(''), 0)
  assert.equal(estimateText('abcd'), 1)
  assert.equal(estimateText('a'.repeat(4000)), 1000)
})

test('a longer history estimates more tokens than a shorter one', () => {
  const short = estimateTokens([{ role: 'user', content: 'hi' }])
  const long = estimateTokens([{ role: 'user', content: 'hi'.repeat(500) }])
  assert.ok(long > short)
  assert.ok(short > 0)
})
