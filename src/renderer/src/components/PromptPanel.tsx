import { Panel } from './Panel'
import styles from './PromptPanel.module.css'

export function PromptPanel({ width }: { width?: number }) {
  return (
    <Panel
      title="Prompt"
      width={width}
      footer={<input className={styles.input} type="text" placeholder="Message" />}
    />
  )
}
