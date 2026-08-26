import styles from './EmptyState.module.css'

export function EmptyState() {
  return (
    <div className={styles.empty}>
      <h1 className={styles.wordmark}>KVCODE</h1>
    </div>
  )
}
