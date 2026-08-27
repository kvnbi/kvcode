import { EditorPane } from './EditorPane'
import { Sidebar } from './Sidebar'
import styles from './CodePanel.module.css'

export function CodePanel({ width }: { width?: number }) {
  const isFlexible = width === undefined

  return (
    <div
      className={isFlexible ? `${styles.code} ${styles.flexible}` : styles.code}
      style={isFlexible ? undefined : { width }}
    >
      <Sidebar />
      <main className={styles.editor}>
        <EditorPane />
      </main>
    </div>
  )
}
