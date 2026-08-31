import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseInline, parseMarkdown } from './markdown.ts'

const sample = [
  '**14 PDFs** total in Downloads, or **8** if you only mean the top level.',
  '',
  'The breakdown:',
  '',
  '**Top level (8):**',
  '- `crispycleanrechnung.pdf`, `crispycleanrechnungdiscount.pdf`',
  '- `EFTA00813341.pdf`',
  '',
  '## A heading',
  '',
  '```',
  'const x = 1',
  '```',
  '',
  '1. first',
  '2. second'
].join('\n')

const blocks = parseMarkdown(sample)

test('block kinds are recognised in order', () => {
  assert.deepEqual(blocks.map((b) => b.kind), [
    'paragraph', 'paragraph', 'paragraph', 'list', 'heading', 'code', 'list'
  ])
})

test('bold is parsed rather than shown literally', () => {
  const first = blocks[0] as { inline: ReturnType<typeof parseInline> }
  assert.ok(first.inline.some((i) => i.kind === 'strong' && i.value === '14 PDFs'))
  assert.ok(!first.inline.some((i) => i.kind === 'text' && i.value.includes('**')))
})

test('lists keep inline code', () => {
  const list = blocks[3] as { items: ReturnType<typeof parseInline>[] }
  assert.equal(list.items.length, 2)
  assert.ok(list.items[0].some((i) => i.kind === 'code' && i.value === 'crispycleanrechnung.pdf'))
})

test('heading level is read', () => {
  assert.equal((blocks[4] as { level: number }).level, 2)
})

test('fenced code keeps its text', () => {
  assert.equal((blocks[5] as { text: string }).text, 'const x = 1')
})

test('ordered lists are marked ordered', () => {
  const list = blocks[6] as { ordered: boolean; items: unknown[] }
  assert.equal(list.ordered, true)
  assert.equal(list.items.length, 2)
})

test('a bold star is not mistaken for a bullet', () => {
  assert.equal(parseMarkdown('**Top level (8):**')[0].kind, 'paragraph')
})

test('unclosed bold stays literal', () => {
  assert.ok(parseInline('**oops').every((i) => i.kind === 'text'))
})

test('links are parsed', () => {
  assert.ok(parseInline('see [docs](https://a.b)').some((i) => i.kind === 'link' && i.href === 'https://a.b'))
})

test('stars inside code spans are not re-parsed', () => {
  assert.ok(parseInline('`a**b`').every((i) => i.kind === 'code'))
})

test('plain text is untouched', () => {
  assert.equal(parseInline('just words')[0].value, 'just words')
})

test('empty input yields no blocks', () => {
  assert.equal(parseMarkdown('').length, 0)
})
