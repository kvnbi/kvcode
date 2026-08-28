import { useCallback, useEffect, useRef, useState } from 'react'
import {
  disposeAllSlots,
  disposeSlot,
  fitSlot,
  focusSlot,
  hasSlot,
  openSlot,
  showSlot,
  writeSlot
} from '@renderer/terminal/sessions'
import { CloseIcon, PlusIcon } from './Icons'
import styles from './TerminalPanel.module.css'
import '@xterm/xterm/css/xterm.css'

let lastActiveId = ''

export function TerminalPanel({ width }: { width?: number }) {
  const container = useRef<HTMLDivElement>(null)
  const [ids, setIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState('')
  const isFlexible = width === undefined

  const sync = useCallback(async () => {
    const snapshots = await window.kvcode.openTerminals()

    if (!container.current) return

    for (const snapshot of snapshots) {
      if (hasSlot(snapshot.id)) continue

      openSlot(snapshot.id, container.current)
      showSlot(snapshot.id, false)
      writeSlot(snapshot.id, snapshot.buffer)
    }

    const list = snapshots.map((snapshot) => snapshot.id)

    if (!list.includes(lastActiveId)) lastActiveId = list[list.length - 1]

    setIds(list)
    setActiveId(lastActiveId)
  }, [])

  useEffect(() => {
    void sync()

    return disposeAllSlots
  }, [sync])

  useEffect(() => window.kvcode.onTerminalData(({ id, data }) => writeSlot(id, data)), [])

  useEffect(
    () =>
      window.kvcode.onTerminalExit((id) => {
        disposeSlot(id)
        void sync()
      }),
    [sync]
  )

  useEffect(() => {
    for (const id of ids) showSlot(id, id === activeId)

    if (activeId) focusSlot(activeId)
  }, [ids, activeId])

  useEffect(() => {
    if (!container.current) return

    const observer = new ResizeObserver(() => fitSlot(activeId))
    observer.observe(container.current)

    return () => observer.disconnect()
  }, [activeId])

  function select(id: string) {
    lastActiveId = id
    setActiveId(id)
  }

  async function addTerminal() {
    const created = await window.kvcode.createTerminal()
    lastActiveId = created.id
    await sync()
  }

  return (
    <section
      className={isFlexible ? `${styles.panel} ${styles.flexible}` : styles.panel}
      style={isFlexible ? undefined : { width }}
    >
      <div className={styles.header}>
        <div className={styles.tabs}>
          {ids.map((id, index) => (
            <div key={id} className={id === activeId ? `${styles.tab} ${styles.tabOn}` : styles.tab}>
              <button type="button" className={styles.tabName} onClick={() => select(id)}>
                {`Terminal ${index + 1}`}
              </button>
              {ids.length > 1 ? (
                <button
                  type="button"
                  className={styles.tabClose}
                  aria-label={`Close terminal ${index + 1}`}
                  onClick={() => void window.kvcode.closeTerminal(id)}
                >
                  <CloseIcon size={10} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.add}
          aria-label="New terminal"
          onClick={() => void addTerminal()}
        >
          <PlusIcon size={13} />
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.surface} ref={container} />
      </div>
    </section>
  )
}
