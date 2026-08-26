import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { readdirSync } from 'node:fs'

const root = resolve(import.meta.dirname, '..')
const packageDir = join(root, 'node_modules', 'electron')
const distDir = join(packageDir, 'dist')
const require = createRequire(import.meta.url)

if (process.platform !== 'darwin') {
  console.log('This helper only supports macOS. Run npm install with Node 22 LTS instead.')
  process.exit(0)
}

if (existsSync(join(distDir, 'Electron.app'))) {
  console.log('Electron binary is already installed.')
  process.exit(0)
}

const version = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).version
const arch = process.arch
const name = `electron-v${version}-darwin-${arch}.zip`
const cacheRoot = join(homedir(), 'Library', 'Caches', 'electron')

function findCachedZip() {
  if (!existsSync(cacheRoot)) return null

  for (const entry of readdirSync(cacheRoot)) {
    const candidate = join(cacheRoot, entry, name)
    if (existsSync(candidate)) return candidate
  }

  return null
}

let zip = findCachedZip()

if (!zip) {
  const url = `https://github.com/electron/electron/releases/download/v${version}/${name}`
  const target = join(cacheRoot, 'manual')
  mkdirSync(target, { recursive: true })
  zip = join(target, name)
  console.log(`Downloading ${url}`)
  execFileSync('curl', ['-L', '--fail', '-o', zip, url], { stdio: 'inherit' })
}

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })
execFileSync('unzip', ['-qq', zip, '-d', distDir], { stdio: 'inherit' })
writeFileSync(join(packageDir, 'path.txt'), 'Electron.app/Contents/MacOS/Electron')

console.log('Electron binary installed at', require('electron'))
