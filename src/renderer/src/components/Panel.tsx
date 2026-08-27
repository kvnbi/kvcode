import type { ReactNode } from 'react'
import styles from './Panel.module.css'

interface PanelProps {
  title: string
  width?: number
  children?: ReactNode
  footer?: ReactNode
}

export function Panel({ title, width, children, footer }: PanelProps) {
  const isFlexible = width === undefined

  return (
    <section
      className={isFlexible ? `${styles.panel} ${styles.flexible}` : styles.panel}
      style={isFlexible ? undefined : { width }}
    >
      <div className={styles.header}>{title}</div>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  )
}
