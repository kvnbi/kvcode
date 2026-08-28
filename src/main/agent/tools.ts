import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import type Anthropic from '@anthropic-ai/sdk'
import { captureFile } from '../services/checkpoints'
import { commandsGranted, requestPermission } from '../services/permissions'
import { listRoots, readDirectory, readTextFile, writeTextFile } from '../services/workspace'

const COMMAND_TIMEOUT = 120000
const MAX_OUTPUT = 20000

export const WRITING_TOOLS = new Set(['edit_file', 'write_file'])

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_files',
    description:
      'List the files and directories inside an open folder. Omit path to list the open folders themselves. Only paths inside folders the user has opened are readable.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path of the directory to list' }
      },
      required: []
    }
  },
  {
    name: 'read_file',
    description:
      'Read the full text of a file inside an open folder. Use list_files first if you do not know the exact path.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path of the file to read' }
      },
      required: ['path']
    }
  },
  {
    name: 'edit_file',
    description:
      'Change part of an existing file by replacing an exact snippet. This is the way to edit code. Send only the lines that change, never the whole file. old_text must appear exactly once, so include enough surrounding lines to make it unique. Read the file first so the snippet matches byte for byte.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path of the file to edit' },
        old_text: { type: 'string', description: 'The exact snippet to replace, unique in the file' },
        new_text: { type: 'string', description: 'The replacement snippet' }
      },
      required: ['path', 'old_text', 'new_text']
    }
  },
  {
    name: 'write_file',
    description:
      'Create a new file, or replace a whole file when almost every line changes. Prefer edit_file for changes to an existing file.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path of the file to write' },
        content: { type: 'string', description: 'The complete contents of the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'run_command',
    description:
      'Run a shell command and return its output and exit code. Use it to run tests, builds, git and other tools. The user is asked to approve commands. Prefer running from a folder the user has open.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to run' },
        cwd: { type: 'string', description: 'Directory to run in, defaults to the open folder' }
      },
      required: ['command']
    }
  }
]

const dirtyPaths = new Set<string>()

export function setDirtyPaths(paths: string[]): void {
  dirtyPaths.clear()
  for (const path of paths) dirtyPaths.add(path)
}

function field(input: unknown, key: string): string | null {
  if (typeof input !== 'object' || input === null) return null

  const value = (input as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

function required(input: unknown, key: string, tool: string): string {
  const value = field(input, key)

  if (value === null) throw new Error(`${tool} requires ${key}`)

  return value
}

function assertWritable(path: string): void {
  if (dirtyPaths.has(path)) {
    throw new Error('This file has unsaved edits in the editor. Ask the user to save it first.')
  }
}

export async function runTool(name: string, input: unknown): Promise<string> {
  if (name === 'list_files') {
    const path = field(input, 'path')

    if (!path) {
      const roots = listRoots()
      return roots.length > 0 ? roots.join('\n') : 'No folders are open.'
    }

    const entries = await readDirectory(path)
    return entries
      .map((entry) => `${entry.kind === 'directory' ? 'dir ' : 'file'} ${entry.path}`)
      .join('\n')
  }

  if (name === 'read_file') {
    const file = await readTextFile(required(input, 'path', 'read_file'))
    return file.text
  }

  if (name === 'edit_file') {
    const path = required(input, 'path', 'edit_file')
    const oldText = required(input, 'old_text', 'edit_file')
    const newText = required(input, 'new_text', 'edit_file')

    assertWritable(path)

    const { text } = await readTextFile(path)
    const at = text.indexOf(oldText)

    if (at === -1) {
      throw new Error('old_text was not found. Read the file again and match it exactly.')
    }

    if (text.indexOf(oldText, at + oldText.length) !== -1) {
      throw new Error('old_text appears more than once. Include more surrounding lines to make it unique.')
    }

    await captureFile(path)
    await writeTextFile(path, text.slice(0, at) + newText + text.slice(at + oldText.length))

    return `Edited ${path}`
  }

  if (name === 'write_file') {
    const path = required(input, 'path', 'write_file')
    const content = required(input, 'content', 'write_file')

    assertWritable(path)
    await captureFile(path)
    await writeTextFile(path, content)

    return `Wrote ${path}`
  }

  if (name === 'run_command') {
    const command = required(input, 'command', 'run_command')
    const cwd = field(input, 'cwd') ?? listRoots()[0] ?? homedir()

    if (!commandsGranted()) {
      const granted = await requestPermission('command', command, 'command', cwd)

      if (!granted) return 'The user did not allow this command to run.'
    }

    return runCommand(command, cwd)
  }

  throw new Error(`Unknown tool ${name}`)
}

function runCommand(command: string, cwd: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true, cwd, env: process.env })
    const chunks: string[] = []
    let length = 0

    const collect = (chunk: Buffer) => {
      if (length >= MAX_OUTPUT) return

      const text = chunk.toString('utf8')
      chunks.push(text)
      length += text.length
    }

    child.stdout.on('data', collect)
    child.stderr.on('data', collect)

    const timer = setTimeout(() => child.kill('SIGKILL'), COMMAND_TIMEOUT)

    child.on('error', (error) => {
      clearTimeout(timer)
      resolve(`The command could not start: ${error.message}`)
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      const output = chunks.join('').slice(0, MAX_OUTPUT)
      resolve(`exit ${code ?? 'unknown'}\n${output || 'no output'}`)
    })
  })
}
