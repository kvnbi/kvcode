import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { looksRisky } from '@shared/permissions'
import type { PermissionRequest } from '@shared/permissions'
import { useChatStore } from '@renderer/state/chatStore'
import type { ChatMessage } from '@renderer/state/chatStore'
import { usePermissionStore } from '@renderer/state/permissionStore'
import { Markdown } from './Markdown'
import { ModelBar } from './ModelBar'
import { Panel } from './Panel'
import styles from './PromptPanel.module.css'

const TITLES: Record<PermissionRequest['kind'], string> = {
  read: 'Read outside your open folders',
  write: 'Write outside your open folders',
  command: 'Run a command on your computer'
}

const ALLOW_LABELS: Record<PermissionRequest['kind'], string> = {
  read: 'Allow this folder',
  write: 'Allow this folder',
  command: 'Allow this command'
}

function scopeNote(request: PermissionRequest): string {
  if (request.kind === 'command') return 'Allowing covers this exact command for the session'

  const verb = request.kind === 'write' ? 'writing to' : 'reading'

  return `Allowing covers ${verb} everything in ${request.scope} for the session`
}

function Request({ request }: { request: PermissionRequest }) {
  const decide = usePermissionStore((state) => state.decide)

  return (
    <div className={styles.request}>
      <div className={styles.requestTitle}>{TITLES[request.kind]}</div>
      <div className={styles.requestDetail}>{request.detail}</div>
      {request.cwd ? <div className={styles.requestCwd}>in {request.cwd}</div> : null}
      <div className={styles.requestScope}>{scopeNote(request)}</div>
      {looksRisky(request.detail) ? (
        <div className={styles.requestWarning}>This can change things outside this project.</div>
      ) : null}
      <div className={styles.requestActions}>
        <button type="button" className={styles.choice} onClick={() => decide('deny')}>
          Deny
        </button>
        <button type="button" className={styles.choice} onClick={() => decide('once')}>
          Allow once
        </button>
        <button type="button" className={styles.allow} onClick={() => decide('session')}>
          {ALLOW_LABELS[request.kind]}
        </button>
      </div>
    </div>
  )
}

function Message({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return <div className={styles.user}>{message.text}</div>
  }

  if (message.role === 'tool') {
    return (
      <div className={styles.tool}>
        <span className={styles.toolName}>{message.tool}</span>
        <span className={styles.toolArgs}>{message.text}</span>
      </div>
    )
  }

  if (message.role === 'result') {
    return <div className={styles.result}>{message.text}</div>
  }

  if (message.role === 'thinking') {
    return <div className={styles.thinking}>{message.text}</div>
  }

  if (message.role === 'error') {
    return <div className={styles.error}>{message.text}</div>
  }

  return <Markdown text={message.text} />
}

const MAX_COMPOSER_HEIGHT = 168

function Composer({ blocked }: { blocked: boolean }) {
  const area = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState('')
  const isRunning = useChatStore((state) => state.isRunning)
  const send = useChatStore((state) => state.send)
  const cancel = useChatStore((state) => state.cancel)

  useEffect(() => {
    const node = area.current

    if (!node) return

    node.style.height = '0px'

    const border = node.offsetHeight - node.clientHeight
    const height = Math.min(node.scrollHeight + border, MAX_COMPOSER_HEIGHT)

    node.style.height = `${height}px`
    node.style.overflowY = height < MAX_COMPOSER_HEIGHT ? 'hidden' : 'auto'
  }, [draft])

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
      ref={area}
      className={styles.input}
      value={draft}
      rows={1}
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
  const isRunning = useChatStore((state) => state.isRunning)
  const title = useChatStore(
    (state) => state.sessions.find((session) => session.id === state.activeId)?.title ?? 'New chat'
  )
  const request = usePermissionStore((state) => state.queue[0])
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, streaming])

  return (
    <Panel title={title} width={width}>
      <div className={styles.main}>
        {messages.length === 0 && !streaming ? (
          <div className={styles.empty}>
            <div className={styles.wordmark}>KVCODE</div>
          </div>
        ) : (
          <div className={styles.thread}>
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {streaming ? <Markdown text={streaming} /> : null}
            {isRunning && !streaming ? <div className={styles.working}>Working</div> : null}
            <div ref={bottom} />
          </div>
        )}
        <div className={styles.footer}>
          {request ? <Request request={request} /> : null}
          <Composer blocked={Boolean(request)} />
          <ModelBar />
        </div>
      </div>
    </Panel>
  )
}
