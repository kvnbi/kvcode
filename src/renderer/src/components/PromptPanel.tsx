import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { looksRisky } from '@shared/permissions'
import type { PermissionRequest } from '@shared/permissions'
import { useChatStore } from '@renderer/state/chatStore'
import { usePermissionStore } from '@renderer/state/permissionStore'
import { Panel } from './Panel'
import styles from './PromptPanel.module.css'

const TITLES: Record<PermissionRequest['kind'], string> = {
  read: 'Read a file outside your open folders',
  write: 'Write a file outside your open folders',
  command: 'Run a command on your computer'
}

function Request({ request }: { request: PermissionRequest }) {
  const decide = usePermissionStore((state) => state.decide)

  return (
    <div className={styles.request}>
      <div className={styles.requestTitle}>{TITLES[request.kind]}</div>
      <div className={styles.requestDetail}>{request.detail}</div>
      {request.cwd ? <div className={styles.requestCwd}>in {request.cwd}</div> : null}
      {looksRisky(request.detail) ? (
        <div className={styles.requestWarning}>This can change things outside this project.</div>
      ) : null}
      <div className={styles.requestActions}>
        <button type="button" className={styles.choice} onClick={() => decide('deny')}>
          Deny
        </button>
        <button type="button" className={styles.choice} onClick={() => decide('session')}>
          Allow for the session
        </button>
        <button type="button" className={styles.allow} onClick={() => decide('once')}>
          Allow once
        </button>
      </div>
    </div>
  )
}

function Composer({ blocked }: { blocked: boolean }) {
  const [draft, setDraft] = useState('')
  const isRunning = useChatStore((state) => state.isRunning)
  const send = useChatStore((state) => state.send)
  const cancel = useChatStore((state) => state.cancel)

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()

    if (isRunning) {
      void cancel()
      return
    }

    const text = draft
    setDraft('')
    void send(text)
  }

  return (
    <textarea
      className={styles.input}
      value={draft}
      rows={2}
      disabled={blocked}
      placeholder={isRunning ? 'Enter to stop' : 'Message'}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

export function PromptPanel({ width }: { width?: number }) {
  const messages = useChatStore((state) => state.messages)
  const streaming = useChatStore((state) => state.streaming)
  const request = usePermissionStore((state) => state.queue[0])
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, streaming])

  return (
    <Panel title="Prompt" width={width}>
      <div className={styles.main}>
        {messages.length === 0 && !streaming ? (
          <div className={styles.empty}>
            <div className={styles.wordmark}>KVCODE</div>
          </div>
        ) : (
          <div className={styles.thread}>
            {messages.map((message) => (
              <div key={message.id} className={`${styles.message} ${styles[message.role]}`}>
                {message.text}
              </div>
            ))}
            {streaming ? (
              <div className={`${styles.message} ${styles.assistant}`}>{streaming}</div>
            ) : null}
            <div ref={bottom} />
          </div>
        )}
        <div className={styles.footer}>
          {request ? <Request request={request} /> : null}
          <Composer blocked={Boolean(request)} />
        </div>
      </div>
    </Panel>
  )
}
