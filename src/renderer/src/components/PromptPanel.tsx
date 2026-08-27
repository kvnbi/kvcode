import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useChatStore } from '@renderer/state/chatStore'
import { Panel } from './Panel'
import styles from './PromptPanel.module.css'

function Composer() {
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
      placeholder={isRunning ? 'Enter to stop' : 'Message'}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

export function PromptPanel({ width }: { width?: number }) {
  const messages = useChatStore((state) => state.messages)
  const streaming = useChatStore((state) => state.streaming)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, streaming])

  return (
    <Panel title="Prompt" width={width} footer={<Composer />}>
      <div className={styles.thread}>
        {messages.map((message) => (
          <div key={message.id} className={`${styles.message} ${styles[message.role]}`}>
            {message.text}
          </div>
        ))}
        {streaming ? <div className={`${styles.message} ${styles.assistant}`}>{streaming}</div> : null}
        <div ref={bottom} />
      </div>
    </Panel>
  )
}
