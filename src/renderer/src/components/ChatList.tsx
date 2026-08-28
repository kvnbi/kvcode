import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useChatStore } from '@renderer/state/chatStore'
import { CloseIcon, GearIcon, PlusIcon } from './Icons'
import styles from './ChatList.module.css'

export function ChatList({ onOpenSettings }: { onOpenSettings: () => void }) {
  const sessions = useChatStore((state) => state.sessions)
  const activeId = useChatStore((state) => state.activeId)
  const openSession = useChatStore((state) => state.openSession)
  const newSession = useChatStore((state) => state.newSession)
  const removeSession = useChatStore((state) => state.removeSession)
  const renameSession = useChatStore((state) => state.renameSession)
  const [editing, setEditing] = useState('')
  const [draft, setDraft] = useState('')

  function commit(id: string) {
    if (draft.trim().length > 0) void renameSession(id, draft)
    setEditing('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, id: string) {
    if (event.key === 'Enter') commit(id)
    if (event.key === 'Escape') setEditing('')
  }

  return (
    <div className={styles.list}>
      <button type="button" className={styles.newChat} onClick={() => void newSession()}>
        <PlusIcon size={13} />
        New chat
      </button>

      <div className={styles.scroll}>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={session.id === activeId ? `${styles.row} ${styles.rowOn}` : styles.row}
          >
            {editing === session.id ? (
              <input
                className={styles.rename}
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => commit(session.id)}
                onKeyDown={(event) => onKeyDown(event, session.id)}
              />
            ) : (
              <button
                type="button"
                className={styles.title}
                title={session.title}
                onClick={() => void openSession(session.id)}
                onDoubleClick={() => {
                  setDraft(session.title)
                  setEditing(session.id)
                }}
              >
                {session.title}
              </button>
            )}
            <button
              type="button"
              className={styles.remove}
              onClick={() => void removeSession(session.id)}
              aria-label={`Delete ${session.title}`}
            >
              <CloseIcon size={11} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className={styles.settings} onClick={onOpenSettings}>
        <GearIcon size={14} />
        Settings
      </button>
    </div>
  )
}
