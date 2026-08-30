import { useEffect, useState } from 'react'
import { PROVIDERS, PROVIDER_LABELS } from '@shared/providers'
import type { ProviderId } from '@shared/providers'
import { useSettingsStore } from '@renderer/state/settingsStore'
import { CloseIcon } from './Icons'
import styles from './Settings.module.css'

const SECTIONS = [{ id: 'models', label: 'Models' }]

export function Settings({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore((state) => state.settings)
  const load = useSettingsStore((state) => state.load)
  const update = useSettingsStore((state) => state.update)
  const saveApiKey = useSettingsStore((state) => state.saveKey)
  const clearApiKey = useSettingsStore((state) => state.clearKey)
  const [keyDraft, setKeyDraft] = useState('')
  const [section, setSection] = useState(SECTIONS[0].id)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!settings) return null

  const provider = settings.provider
  const hasKey = settings.storedKeys.includes(provider)

  async function selectProvider(next: ProviderId) {
    setKeyDraft('')
    await update({ provider: next })
  }

  async function saveKey() {
    await saveApiKey(provider, keyDraft.trim())
    setKeyDraft('')
  }

  async function removeKey() {
    await clearApiKey(provider)
  }

  return (
    <div className={styles.backdrop} onPointerDown={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-label="Settings"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          Settings
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close settings">
            <CloseIcon size={12} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.sidebar}>
            {SECTIONS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === section ? `${styles.tab} ${styles.tabOn}` : styles.tab}
                onClick={() => setSection(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            <div className={styles.field}>
              <div className={styles.label}>Provider</div>
              <div className={styles.row}>
                {PROVIDERS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={id === provider ? `${styles.choice} ${styles.choiceOn}` : styles.choice}
                    onClick={() => selectProvider(id)}
                  >
                    {PROVIDER_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.label}>API key</div>
              <div className={styles.row}>
                <input
                  className={styles.input}
                  type="password"
                  value={keyDraft}
                  disabled={hasKey}
                  placeholder={hasKey ? 'Key stored' : 'Paste a key'}
                  onChange={(event) => setKeyDraft(event.target.value)}
                />
                {hasKey ? (
                  <button type="button" className={styles.action} onClick={removeKey}>
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.action}
                    disabled={keyDraft.trim().length === 0}
                    onClick={saveKey}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
