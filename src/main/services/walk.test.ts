import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { findIn, searchIn } from './walk.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SRC = resolve(ROOT, 'src')

test('a glob finds files by path', async () => {
  assert.ok((await findIn([SRC], 'renderer/**/*.tsx')).includes('App.tsx'))
})

test('a bare pattern matches the file name at any depth', async () => {
  assert.ok((await findIn([SRC], 'diff.ts')).includes('shared/diff.ts'))
})

test('ignored directories are skipped', async () => {
  assert.ok(!(await findIn([ROOT], '**/*.json')).includes('node_modules'))
})

test('search returns path line and text', async () => {
  const hits = await searchIn([SRC], 'export function modelLabel', null)
  assert.match(hits, /models\.ts:\d+: /)
})

test('a glob filter narrows the search', async () => {
  const hits = await searchIn([SRC], 'import', '**/*.css')
  assert.ok(!hits.includes('.tsx'))
})

test('no matches reports plainly', async () => {
  const needle = ['zzzz', 'notpresent', 'zzzz'].join('')
  assert.equal(await searchIn([SRC], needle, null), 'No matches.')
})

test('no files matched reports plainly', async () => {
  assert.equal(await findIn([SRC], '**/*.zzzz'), 'No files matched.')
})

test('an invalid regular expression is rejected', async () => {
  await assert.rejects(() => searchIn([SRC], '[unclosed', null), /regular expression/)
})

test('the match cap is enforced', async () => {
  const hits = await searchIn([SRC], 'e', null)
  assert.ok(hits.split('\n').length <= 101)
})
