import { PANELS, useLayoutStore } from '@renderer/state/layoutStore'
import type { PanelId } from '@renderer/state/layoutStore'
import { GearIcon } from './Icons'
import styles from './TitleBar.module.css'

const LABELS: Record<PanelId, string> = {
  code: 'Code',
  diff: 'Diff',
  output: 'Output',
  browser: 'Browser',
  terminal: 'Terminal'
}

export function TitleBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const open = useLayoutStore((state) => state.open)
  const togglePanel = useLayoutStore((state) => state.togglePanel)
  const isMac = window.kvcode.platform === 'darwin'

  return (
    <header className={styles.bar}>
      {isMac ? <div className={styles.macSpacer} /> : null}

      <div className={styles.brand}>KVCODE</div>

      <div className={styles.toggles}>
        {PANELS.map((id) => (
          <button
            key={id}
            type="button"
            className={open[id] ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
            aria-pressed={open[id]}
            onClick={() => togglePanel(id)}
          >
            {LABELS[id]}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.settings}
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Settings"
      >
        <GearIcon size={15} />
      </button>
    </header>
  )
}
