import { useEffect, useState } from 'react'
import { PROVIDERS, PROVIDER_LABELS } from '@shared/providers'
import type { ProviderId } from '@shared/providers'
import { MAX_INSTRUCTIONS } from '@shared/chat'
import { useSettingsStore } from '@renderer/state/settingsStore'
import { CloseIcon, ProviderIcon } from './Icons'
import styles from './Settings.module.css'

const SECTIONS = [
  { id: 'models', label: 'Models' },
  { id: 'instructions', label: 'Instructions' }
]

const EMPTY_DRAFTS: Record<ProviderId, string> = { anthropic: '', openai: '' }

export function Settings({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore((state) => state.settings)
  const load = useSettingsStore((state) => state.load)
  const update = useSettingsStore((state) => state.update)
  const saveApiKey = useSettingsStore((state) => state.saveKey)
  const clearApiKey = useSettingsStore((state) => state.clearKey)
  const [keyDrafts, setKeyDrafts] = useState(EMPTY_DRAFTS)
  const [section, setSection] = useState(SECTIONS[0].id)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (settings) setDraft(settings.instructions)
  }, [settings?.instructions])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!settings) return null

  async function saveKey(provider: ProviderId) {
    await saveApiKey(provider, keyDrafts[provider].trim())
    setKeyDrafts((prev) => ({ ...prev, [provider]: '' }))
  }

  async function removeKey(provider: ProviderId) {
    await clearApiKey(provider)
  }

  async function saveInstructions() {
    await update({ instructions: draft.slice(0, MAX_INSTRUCTIONS) })
    setSaved(true)
    setTimeout(() => setSaved(false), 1400)
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
            {section === 'instructions' ? (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Custom instructions</div>
                <textarea
                  className={styles.area}
                  value={draft}
                  maxLength={MAX_INSTRUCTIONS}
                  placeholder="e.g. be concise and accurate"
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.action}
                    disabled={draft === settings.instructions}
                    onClick={() => void saveInstructions()}
                  >
                    {saved ? 'Saved' : 'Save'}
                  </button>
                  <span className={styles.count}>{`${draft.length} of ${MAX_INSTRUCTIONS}`}</span>
                </div>
              </div>
            ) : (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Providers</div>
                {PROVIDERS.map((provider) => {
                  const hasKey = settings.storedKeys.includes(provider)

                  return (
                    <div key={provider} className={styles.field}>
                      <div className={styles.label}>
                        <ProviderIcon provider={provider} size={14} />
                        {PROVIDER_LABELS[provider]}
                      </div>
                      <div className={styles.row}>
                        <input
                          className={styles.input}
                          type="password"
                          value={keyDrafts[provider]}
                          disabled={hasKey}
                          placeholder={hasKey ? 'Key stored' : 'Paste a key'}
                          onChange={(event) =>
                            setKeyDrafts((prev) => ({ ...prev, [provider]: event.target.value }))
                          }
                        />
                        {hasKey ? (
                          <button
                            type="button"
                            className={styles.action}
                            onClick={() => void removeKey(provider)}
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.action}
                            disabled={keyDrafts[provider].trim().length === 0}
                            onClick={() => void saveKey(provider)}
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
