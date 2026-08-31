import { useEffect, useState } from 'react'
import { contextWindow, formatTokens, modelLabel } from '@shared/models'
import { useChatStore } from '@renderer/state/chatStore'
import { useSettingsStore } from '@renderer/state/settingsStore'
import styles from './ModelBar.module.css'

const COMPACT_AT = 0.7

type Menu = 'model' | null

export function ModelBar() {
  const settings = useSettingsStore((state) => state.settings)
  const models = useSettingsStore((state) => state.models)
  const load = useSettingsStore((state) => state.load)
  const update = useSettingsStore((state) => state.update)
  const usage = useChatStore((state) => state.usage)
  const [menu, setMenu] = useState<Menu>(null)

  useEffect(() => {
    void load()
  }, [load])

  if (!settings) return null

  const limit = contextWindow(settings.model)
  const tokens = usage ?? 0
  const ratio = tokens / limit

  const options = models.includes(settings.model) ? models : [settings.model, ...models]

  return (
    <div className={styles.bar}>
      {menu ? <div className={styles.backdrop} onClick={() => setMenu(null)} /> : null}

      <div className={styles.slot}>
        {menu === 'model' ? (
          <div className={styles.menu}>
            {options.map((id) => (
              <button
                key={id}
                type="button"
                className={id === settings.model ? `${styles.item} ${styles.itemOn}` : styles.item}
                onClick={() => {
                  setMenu(null)
                  void update({ model: id })
                }}
              >
                {modelLabel(id)}
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className={styles.button}
          onClick={() => setMenu(menu === 'model' ? null : 'model')}
        >
          {modelLabel(settings.model)}
        </button>
      </div>

      <span
        className={`${styles.usage} ${ratio >= 1 ? styles.usageOver : ratio >= COMPACT_AT ? styles.usageHigh : ''}`}
        title={
          ratio >= 1
            ? `${tokens.toLocaleString()} tokens exceeds this model's ${limit.toLocaleString()} token window. Older messages will be summarised on your next message.`
            : `${tokens.toLocaleString()} of ${limit.toLocaleString()} context tokens used`
        }
      >
        {`${formatTokens(tokens)} / ${formatTokens(limit)}`}
      </span>
    </div>
  )
}
