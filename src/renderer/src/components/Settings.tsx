import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { PROVIDERS, PROVIDER_LABELS, SEARCH_KEY } from '@shared/providers'
import type { SecretId } from '@shared/providers'
import { MAX_INSTRUCTIONS } from '@shared/chat'
import { useSettingsStore } from '@renderer/state/settingsStore'
import { CloseIcon, ProviderIcon, SearchIcon } from './Icons'
import styles from './Settings.module.css'

const SECTIONS = [
  { id: 'models', label: 'Models' },
  { id: 'instructions', label: 'Instructions' }
]

const EMPTY_DRAFTS: Record<SecretId, string> = { anthropic: '', openai: '', tavily: '' }

interface KeyFieldProps {
  id: SecretId
  label: string
  icon: ReactNode
  draft: string
  stored: boolean
  onChange: (value: string) => void
  onSave: () => void
  onRemove: () => void
}

function KeyField({ id, label, icon, draft, stored, onChange, onSave, onRemove }: KeyFieldProps) {
  return (
    <div key={id} className={styles.field}>
      <div className={styles.label}>
        {icon}
        {label}
      </div>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="password"
          value={draft}
          disabled={stored}
          placeholder={stored ? 'Key stored' : 'Paste a key'}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.action}
          disabled={!stored && draft.trim().length === 0}
          onClick={stored ? onRemove : onSave}
        >
          {stored ? 'Remove' : 'Save'}
        </button>
      </div>
    </div>
  )
}

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

  async function saveKey(id: SecretId) {
    await saveApiKey(id, keyDrafts[id].trim())
    setKeyDrafts((prev) => ({ ...prev, [id]: '' }))
  }

  async function removeKey(id: SecretId) {
    await clearApiKey(id)
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
                {PROVIDERS.map((provider) => (
                  <KeyField
                    key={provider}
                    id={provider}
                    label={PROVIDER_LABELS[provider]}
                    icon={<ProviderIcon provider={provider} size={14} />}
                    draft={keyDrafts[provider]}
                    stored={settings.storedKeys.includes(provider)}
                    onChange={(value) => setKeyDrafts((prev) => ({ ...prev, [provider]: value }))}
                    onSave={() => void saveKey(provider)}
                    onRemove={() => void removeKey(provider)}
                  />
                ))}
                <div className={styles.sectionHeader}>Web search</div>
                <KeyField
                  id={SEARCH_KEY}
                  label="Tavily"
                  icon={<SearchIcon size={14} />}
                  draft={keyDrafts[SEARCH_KEY]}
                  stored={settings.storedKeys.includes(SEARCH_KEY)}
                  onChange={(value) => setKeyDrafts((prev) => ({ ...prev, [SEARCH_KEY]: value }))}
                  onSave={() => void saveKey(SEARCH_KEY)}
                  onRemove={() => void removeKey(SEARCH_KEY)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
