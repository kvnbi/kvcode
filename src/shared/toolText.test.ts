import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toolSummary } from './toolText.ts'

test('a command is shown on its own', () => {
  assert.equal(toolSummary({ command: 'npm test', cwd: '/tmp' }), 'npm test')
})

test('a file path is shown when there is no command', () => {
  assert.equal(toolSummary({ path: 'src/main.ts' }), 'src/main.ts')
})

test('a search pattern includes its glob', () => {
  assert.equal(toolSummary({ pattern: 'fn', glob: '*.rs' }), 'fn in *.rs')
})

test('a search pattern without a glob stands alone', () => {
  assert.equal(toolSummary({ pattern: 'todo' }), 'todo')
})

test('command wins over path', () => {
  assert.equal(toolSummary({ path: 'a.ts', command: 'ls' }), 'ls')
})

test('an unknown shape falls back to its first string', () => {
  assert.equal(toolSummary({ target: 'something' }), 'something')
})

test('a shape with no strings falls back to json', () => {
  assert.equal(toolSummary({ count: 3 }), '{"count":3}')
})

test('a plain string passes through', () => {
  assert.equal(toolSummary('raw'), 'raw')
})

test('empty values are skipped', () => {
  assert.equal(toolSummary({ command: '', path: 'b.ts' }), 'b.ts')
})

test('null and undefined are safe', () => {
  assert.equal(toolSummary(null), '')
  assert.equal(toolSummary(undefined), '')
})
