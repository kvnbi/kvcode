import { chmodSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const prebuilds = join(root, 'node_modules', 'node-pty', 'prebuilds')
const target = join(prebuilds, `${process.platform}-${process.arch}`)

if (!existsSync(prebuilds)) {
  console.log('node-pty is not installed, skipping.')
  process.exit(0)
}

if (process.platform === 'win32') {
  console.log('Nothing to do on Windows.')
  process.exit(0)
}

const helper = join(target, 'spawn-helper')

if (!existsSync(helper)) {
  console.log(`No prebuilt spawn-helper for ${process.platform}-${process.arch}.`)
  console.log('Run npm install-scripts approve node-pty, then reinstall.')
  process.exit(1)
}

if (statSync(helper).mode & 0o111) {
  console.log('node-pty spawn-helper is already executable.')
  process.exit(0)
}

chmodSync(helper, 0o755)
console.log('Made node-pty spawn-helper executable.')
