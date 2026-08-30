import { useEffect, useState } from 'react'
import { modelLabel } from '@shared/models'
import { useSettingsStore } from '@renderer/state/settingsStore'
import styles from './ModelBar.module.css'

type Menu = 'model' | null

export function ModelBar() {
  const settings = useSettingsStore((state) => state.settings)
  const models = useSettingsStore((state) => state.models)
  const load = useSettingsStore((state) => state.load)
  const update = useSettingsStore((state) => state.update)
  const [menu, setMenu] = useState<Menu>(null)

  useEffect(() => {
    void load()
  }, [load])

  if (!settings) return null

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

    </div>
  )
}
