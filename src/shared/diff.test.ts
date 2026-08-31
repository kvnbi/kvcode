import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countChanges, diffFile } from './diff.ts'

const render = (a: string, b: string) =>
  diffFile(a, b).map((l) => (l.kind === 'gap' ? `... ${l.count}` : `${l.kind[0]} ${l.text}`))

test('identical input yields no diff', () => {
  assert.equal(diffFile('a\nb\nc', 'a\nb\nc').length, 0)
})

test('a changed line is one add and one remove', () => {
  const out = countChanges(diffFile('a\nb\nc', 'a\nB\nc'))
  assert.deepEqual(out, { added: 1, removed: 1 })
})

test('remove precedes add', () => {
  assert.equal(render('a\nb\nc', 'a\nB\nc').join('|'), 'c a|r b|a B|c c')
})

test('pure insert', () => {
  assert.equal(countChanges(diffFile('a\nc', 'a\nb\nc')).added, 1)
})

test('pure delete', () => {
  assert.equal(countChanges(diffFile('a\nb\nc', 'a\nc')).removed, 1)
})

test('empty to content', () => {
  assert.equal(countChanges(diffFile('', 'x\ny')).added, 2)
})

test('content to empty', () => {
  assert.equal(countChanges(diffFile('x\ny', '')).removed, 2)
})

test('both empty', () => {
  assert.equal(diffFile('', '').length, 0)
})

test('a long file collapses to a hunk', () => {
  const big = Array.from({ length: 200 }, (_, i) => `line ${i}`)
  const edited = [...big]
  edited[100] = 'CHANGED'
  const out = diffFile(big.join('\n'), edited.join('\n'))
  const kept = out.filter((l) => l.kind !== 'gap').length
  const skipped = out.filter((l) => l.kind === 'gap').reduce((t, l) => t + l.count, 0)

  assert.ok(out.length < 12)
  assert.ok(out.some((l) => l.kind === 'gap'))
  assert.equal(kept + skipped, 201)
})

test('context carries both line numbers', () => {
  const out = diffFile('a\nb\nc', 'a\nB\nc')
  assert.equal(out[0].before, 1)
  assert.equal(out[0].after, 1)
  assert.equal(out[1].after, 0)
  assert.equal(out[2].before, 0)
})

test('a trailing newline is not a line', () => {
  assert.equal(countChanges(diffFile('a\n', 'a\nb\n')).added, 1)
})

test('oversized input falls back without hanging', () => {
  const a = Array.from({ length: 1500 }, (_, i) => `x ${i}`).join('\n')
  const b = Array.from({ length: 1500 }, (_, i) => `y ${i}`).join('\n')
  const start = Date.now()
  const out = diffFile(a, b)

  assert.ok(Date.now() - start < 1500)
  assert.deepEqual(countChanges(out), { added: 1500, removed: 1500 })
})
