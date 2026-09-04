import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contextWindow, formatTokens, modelLabel } from './models.ts'

const cases: [string, string][] = [
  ['claude-opus-5', 'Opus 5'],
  ['claude-sonnet-5', 'Sonnet 5'],
  ['claude-opus-4-8', 'Opus 4.8'],
  ['claude-haiku-4-5-20251001', 'Haiku 4.5 (2025-10-01)'],
  ['gpt-6-astra', 'GPT 6 Astra'],
  ['gpt-5.6-sol', 'GPT 5.6 Sol'],
  ['gpt-5.6-terra', 'GPT 5.6 Terra'],
  ['gpt-5.6-luna', 'GPT 5.6 Luna'],
  ['gpt-4o', 'GPT 4o'],
  ['gpt-4o-2024-08-06', 'GPT 4o (2024-08-06)']
]

for (const [id, label] of cases) {
  test(`${id} renders as ${label}`, () => {
    assert.equal(modelLabel(id), label)
  })
}

test('a pinned snapshot never collides with its alias', () => {
  const labels = ['gpt-4o', 'gpt-4o-2024-08-06'].map(modelLabel)
  assert.equal(new Set(labels).size, labels.length)
})

const windows: [string, number][] = [
  ['claude-opus-5', 1000000],
  ['claude-sonnet-5', 1000000],
  ['gpt-6-astra', 1050000],
  ['gpt-5.6-sol', 1050000],
  ['gpt-5.6-terra', 1050000],
  ['gpt-5.6-luna', 1050000],
  ['gpt-4o', 128000]
]

test('a future gpt generation inherits the large window', () => {
  assert.equal(contextWindow('gpt-7-something'), 1050000)
})

for (const [id, expected] of windows) {
  test(`context window for ${id}`, () => {
    assert.equal(contextWindow(id), expected)
  })
}

test('context window falls back for unknown ids', () => {
  assert.equal(contextWindow('some-new-model'), 128000)
})

test('older claude models keep the smaller window', () => {
  assert.equal(contextWindow('claude-3-5-sonnet-20241022'), 200000)
})

const formats: [number, string][] = [
  [0, '0'],
  [1, '1'],
  [999, '999'],
  [1000, '1k'],
  [12345, '12.3k'],
  [99900, '99.9k'],
  [123456, '123k'],
  [500000, '500k'],
  [1000000, '1M'],
  [1050000, '1.1M']
]

for (const [input, expected] of formats) {
  test(`formats ${input} as ${expected}`, () => {
    assert.equal(formatTokens(input), expected)
  })
}

test('formatTokens rejects broken counts', () => {
  assert.equal(formatTokens(-5), '0')
  assert.equal(formatTokens(Number.NaN), '0')
})
