import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanTitle, shorten } from './titleText.ts'

const kept: [string, string][] = [
  ['Terminal restored session message', 'Terminal restored session message'],
  ['"Terminal restored session message"', 'Terminal restored session message'],
  ['Title: Fix the compaction budget', 'Fix the compaction budget'],
  ['title - Fix the compaction budget', 'Fix the compaction budget'],
  ['Debugging the blank chat issue.', 'Debugging the blank chat issue'],
  ['**File attachments**', 'File attachments'],
  ['`Context indicator`', 'Context indicator'],
  ['   Type   scale  and  padding   ', 'Type scale and padding'],
  ['Summarise the easy-git project;', 'Summarise the easy-git project']
]

for (const [raw, expected] of kept) {
  test(`keeps ${JSON.stringify(raw)}`, () => {
    assert.equal(cleanTitle(raw), expected)
  })
}

test('takes the first usable line when the model adds a preamble', () => {
  assert.equal(cleanTitle('Here is a title:\n\nContext indicator'), 'Context indicator')
})

test('skips a blank first line', () => {
  assert.equal(cleanTitle('\n\nFile attachments'), 'File attachments')
})

const rejected: string[] = [
  '',
  '   ',
  'ok',
  '...',
  '"""',
  'I would be happy to help you name this conversation about the terminal panel and its restored session behaviour',
  'This conversation covers a long and detailed discussion of many different topics across the whole application'
]

for (const raw of rejected) {
  test(`rejects ${JSON.stringify(raw.slice(0, 30))}`, () => {
    assert.equal(cleanTitle(raw), '')
  })
}

const atLimit = 'Terminal restored session and blank window guard'

test('keeps a title at the length limit', () => {
  assert.equal(atLimit.length, 48)
  assert.equal(cleanTitle(atLimit), atLimit)
})

test('rejects a title one character too long', () => {
  assert.equal(cleanTitle(`${atLimit}s`), '')
})

test('rejects a one word interjection', () => {
  assert.equal(cleanTitle('Sure!'), '')
  assert.equal(cleanTitle('Certainly'), '')
})

test('rejects a bare lead in line', () => {
  assert.equal(cleanTitle('Here is a title:'), '')
})

test('a refusal followed by a real title still yields the title', () => {
  assert.equal(cleanTitle('Sure!\nBlank chat and context indicator'), 'Blank chat and context indicator')
})

test('a short title is left alone', () => {
  assert.equal(shorten('Blank chat and context'), 'Blank chat and context')
})

test('a long title breaks at a word boundary', () => {
  const out = shorten('are you sure the context stuff works I just opened a chat')
  assert.ok(out.endsWith('...'))
  assert.ok(!out.includes('  '))
  assert.equal(out, 'are you sure the context stuff works I just...')
  assert.ok(out.length <= 48 + 3)
})

test('no half word is left before the ellipsis', () => {
  const out = shorten('make it possible to upload files and copy and paste things')
  assert.ok(out.endsWith('...'))
  const words = out.slice(0, -3).trim().split(' ')
  assert.ok('make it possible to upload files and copy and paste things'.split(' ').includes(words[words.length - 1]))
})

test('a single very long word is cut rather than dropped', () => {
  const out = shorten('a'.repeat(80))
  assert.equal(out, `${'a'.repeat(48)}...`)
})

test('newlines collapse before shortening', () => {
  assert.equal(shorten('first\nsecond'), 'first second')
})

test('the ai limit matches the fallback limit', () => {
  assert.equal(cleanTitle('a b '.repeat(20).trim()), '')
  assert.ok(shorten('a b '.repeat(20).trim()).length <= 51)
})
