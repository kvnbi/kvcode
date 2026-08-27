import type Anthropic from '@anthropic-ai/sdk'
import { listRoots, readDirectory, readTextFile } from '../services/workspace'

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
  }
]

function asPath(input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return null

  const value = (input as { path?: unknown }).path
  return typeof value === 'string' && value.length > 0 ? value : null
}

export async function runTool(name: string, input: unknown): Promise<string> {
  if (name === 'list_files') {
    const path = asPath(input)

    if (!path) {
      const roots = listRoots()
      return roots.length > 0 ? roots.join('\n') : 'No folders are open.'
    }

    const entries = await readDirectory(path)
    return entries.map((entry) => `${entry.kind === 'directory' ? 'dir ' : 'file'} ${entry.path}`).join('\n')
  }

  if (name === 'read_file') {
    const path = asPath(input)

    if (!path) throw new Error('read_file requires a path')

    const file = await readTextFile(path)
    return file.text
  }

  throw new Error(`Unknown tool ${name}`)
}
