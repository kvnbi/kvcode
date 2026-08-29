export interface Inline {
  kind: 'text' | 'strong' | 'em' | 'code' | 'link'
  value: string
  href?: string
}

export type Block =
  | { kind: 'heading'; level: number; inline: Inline[] }
  | { kind: 'paragraph'; inline: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'code'; text: string }

const FENCE = /^\s*```/
const HEADING = /^(#{1,6})\s+(.*)$/
const BULLET = /^\s*[-*]\s+(.*)$/
const NUMBER = /^\s*\d+[.)]\s+(.*)$/

const CODE_SPAN = /^`([^`]+)`/
const STRONG = /^\*\*([^*]+)\*\*/
const EMPHASIS = /^([*_])([^*_]+)\1/
const LINK = /^\[([^\]]*)\]\(([^)\s]+)\)/

export function parseInline(source: string): Inline[] {
  const out: Inline[] = []
  let buffer = ''
  let index = 0

  const flush = () => {
    if (buffer.length === 0) return

    out.push({ kind: 'text', value: buffer })
    buffer = ''
  }

  while (index < source.length) {
    const rest = source.slice(index)

    const code = CODE_SPAN.exec(rest)

    if (code) {
      flush()
      out.push({ kind: 'code', value: code[1] })
      index += code[0].length
      continue
    }

    const strong = STRONG.exec(rest)

    if (strong) {
      flush()
      out.push({ kind: 'strong', value: strong[1] })
      index += strong[0].length
      continue
    }

    const emphasis = EMPHASIS.exec(rest)

    if (emphasis) {
      flush()
      out.push({ kind: 'em', value: emphasis[2] })
      index += emphasis[0].length
      continue
    }

    const link = LINK.exec(rest)

    if (link) {
      flush()
      out.push({ kind: 'link', value: link[1], href: link[2] })
      index += link[0].length
      continue
    }

    buffer += source[index]
    index += 1
  }

  flush()

  return out
}

function startsBlock(line: string): boolean {
  return FENCE.test(line) || HEADING.test(line) || BULLET.test(line) || NUMBER.test(line)
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.split('\n')
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (FENCE.test(line)) {
      const body: string[] = []
      index += 1

      while (index < lines.length && !FENCE.test(lines[index])) {
        body.push(lines[index])
        index += 1
      }

      index += 1
      blocks.push({ kind: 'code', text: body.join('\n') })
      continue
    }

    const heading = HEADING.exec(line)

    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, inline: parseInline(heading[2]) })
      index += 1
      continue
    }

    if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = NUMBER.test(line)
      const items: Inline[][] = []

      while (index < lines.length) {
        const match = ordered ? NUMBER.exec(lines[index]) : BULLET.exec(lines[index])

        if (!match) break

        items.push(parseInline(match[1]))
        index += 1
      }

      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    if (line.trim().length === 0) {
      index += 1
      continue
    }

    const paragraph: string[] = []

    while (index < lines.length && lines[index].trim().length > 0 && !startsBlock(lines[index])) {
      paragraph.push(lines[index].trim())
      index += 1
    }

    blocks.push({ kind: 'paragraph', inline: parseInline(paragraph.join(' ')) })
  }

  return blocks
}
