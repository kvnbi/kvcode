import { parseMarkdown } from '@renderer/lib/markdown'
import type { Inline } from '@renderer/lib/markdown'
import styles from './Markdown.module.css'

function renderInline(items: Inline[]) {
  return items.map((item, index) => {
    if (item.kind === 'strong') return <strong key={index}>{item.value}</strong>
    if (item.kind === 'em') return <em key={index}>{item.value}</em>

    if (item.kind === 'code') {
      return (
        <code key={index} className={styles.code}>
          {item.value}
        </code>
      )
    }

    if (item.kind === 'link') {
      return (
        <a key={index} className={styles.link} href={item.href} target="_blank" rel="noreferrer">
          {item.value}
        </a>
      )
    }

    return <span key={index}>{item.value}</span>
  })
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className={styles.body}>
      {parseMarkdown(text).map((block, index) => {
        if (block.kind === 'code') {
          return (
            <pre key={index} className={styles.pre}>
              {block.text}
            </pre>
          )
        }

        if (block.kind === 'heading') {
          return (
            <div key={index} className={styles.heading}>
              {renderInline(block.inline)}
            </div>
          )
        }

        if (block.kind === 'list') {
          const items = block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))

          return block.ordered ? (
            <ol key={index} className={styles.list}>
              {items}
            </ol>
          ) : (
            <ul key={index} className={styles.list}>
              {items}
            </ul>
          )
        }

        return (
          <p key={index} className={styles.paragraph}>
            {renderInline(block.inline)}
          </p>
        )
      })}
    </div>
  )
}
