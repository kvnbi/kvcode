import { test } from 'node:test'
import assert from 'node:assert/strict'
import type Anthropic from '@anthropic-ai/sdk'
import { charsFor, estimateText, estimateTokens, isTurnStart, pruneHistory, safeCutIndex, squeeze, summaryPrompt, trimToBudget, withSummary } from './compaction.ts'

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

function turn(prompt: string, replyChars: number): Anthropic.MessageParam[] {
  return [
    { role: 'user', content: prompt },
    { role: 'assistant', content: [{ type: 'text', text: 'x'.repeat(replyChars) }] }
  ]
}

test('charsFor converts a token budget into characters', () => {
  assert.equal(charsFor(1000), 4000)
  assert.equal(charsFor(-5), 0)
})

test('summaryPrompt keeps the most recent history when bounded', () => {
  const messages = [...turn('oldest', 100), ...turn('newest', 100)]
  const prompt = summaryPrompt(messages, 2000)
  assert.ok(prompt.includes('newest'))
  assert.ok(prompt.length < JSON.stringify(messages).length + 2000)
})

test('summaryPrompt never falls below a usable floor', () => {
  const messages = [...turn('alpha', 5000)]
  assert.ok(summaryPrompt(messages, 10).length > 1000)
})

test('trimToBudget returns history untouched when it already fits', () => {
  const messages = turn('hello', 10)
  assert.deepEqual(trimToBudget(messages, 100000), messages)
})

test('trimToBudget drops whole turns from the front', () => {
  const messages = [...turn('first', 4000), ...turn('second', 100)]
  const out = trimToBudget(messages, 200)
  assert.ok(estimateTokens(out) <= 200)
  assert.equal(out[0].content, 'second')
})

test('trimToBudget keeps the newest turn rather than emptying history', () => {
  const messages = [...turn('first', 4000), ...turn('second', 4000)]
  const out = trimToBudget(messages, 50)
  assert.ok(out.length > 0)
  assert.equal(out[0].content, 'second')
})

test('trimToBudget always starts a retained tail at a turn boundary', () => {
  const messages = [...turn('first', 4000), ...turn('second', 100), ...turn('third', 100)]
  const out = trimToBudget(messages, 200)
  assert.ok(isTurnStart(out[0]))
})

test('squeeze shrinks a single oversized message to fit', () => {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: 'y'.repeat(400000) }]
  const out = squeeze(messages, 2000)
  assert.ok(estimateTokens(out) <= 2000)
  assert.equal(out.length, 1)
})

test('squeeze truncates oversized tool results', () => {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: 'go' },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'z'.repeat(200000) }] }
  ]
  const out = squeeze(messages, 1000)
  assert.ok(estimateTokens(out) <= 1000)
})

test('a huge history collapses under a small window', () => {
  const messages: Anthropic.MessageParam[] = []
  for (let i = 0; i < 40; i += 1) messages.push(...turn(`turn ${i}`, 20000))
  assert.ok(estimateTokens(messages) > 190000)
  const out = trimToBudget(pruneHistory(messages), 5000)
  assert.ok(estimateTokens(out) <= 5000)
  assert.ok(out.length > 0)
})

const shot = (data: string): Anthropic.MessageParam => ({
  role: 'user',
  content: [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data } },
    { type: 'text', text: 'what is this' }
  ]
})

test('an image is estimated by a flat cost, not by its byte length', () => {
  const small = estimateTokens([shot('a'.repeat(1000))])
  const large = estimateTokens([shot('a'.repeat(4000000))])
  assert.equal(small, large)
})

test('an image costs far less than its base64 length suggests', () => {
  assert.ok(estimateTokens([shot('a'.repeat(4000000))]) < 5000)
})

test('a message carrying an image still counts as a turn start', () => {
  assert.equal(isTurnStart(shot('a')), true)
})

test('a tool result is still not a turn start', () => {
  const message: Anthropic.MessageParam = {
    role: 'user',
    content: [{ type: 'tool_result', tool_use_id: 't1', content: 'out' }]
  }
  assert.equal(isTurnStart(message), false)
})

test('trimming keeps a turn that begins with an image', () => {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: 'old' },
    { role: 'assistant', content: [{ type: 'text', text: 'z'.repeat(40000) }] },
    shot('b'.repeat(200))
  ]
  const out = trimToBudget(messages, 3000)
  assert.ok(estimateTokens(out) <= 3000)
  assert.ok(Array.isArray(out[0].content))
})
