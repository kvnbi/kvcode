import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEntries } from './sessions.ts'

const good = '{"role":"user","content":"one"}\n{"role":"assistant","content":"two"}\n'

test('reads every entry from a clean log', () => {
  assert.equal(parseEntries(good).length, 2)
})

test('a truncated trailing write costs one entry, not the chat', () => {
  const entries = parseEntries(`${good}{"role":"user","content":"cut`)
  assert.equal(entries.length, 2)
  assert.equal(entries[1].content, 'two')
})

test('a corrupt line in the middle does not hide later entries', () => {
  const entries = parseEntries('{"role":"user","content":"one"}\nnot json\n{"role":"user","content":"three"}\n')
  assert.equal(entries.length, 2)
  assert.equal(entries[1].content, 'three')
})

test('blank lines are ignored', () => {
  assert.equal(parseEntries(`\n\n${good}\n`).length, 2)
})

test('a fully corrupt file yields no entries rather than throwing', () => {
  assert.equal(parseEntries('garbage\nmore garbage').length, 0)
})

test('an empty file yields no entries', () => {
  assert.equal(parseEntries('').length, 0)
})
