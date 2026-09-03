import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent, KeyboardEvent } from 'react'
import { looksRisky } from '@shared/permissions'
import type { Attachment } from '@shared/attachments'
import { unsupportedReason } from '@shared/models'
import { useSettingsStore } from '@renderer/state/settingsStore'
import type { PermissionRequest } from '@shared/permissions'
import { useChatStore } from '@renderer/state/chatStore'
import type { ChatMessage } from '@renderer/state/chatStore'
import { usePermissionStore } from '@renderer/state/permissionStore'
import { ChevronIcon, CloseIcon, CopyIcon, EnterIcon } from './Icons'
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
  if (message.attachment) {
    return <AttachmentBubble attachment={message.attachment} />
  }

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
    const lines = message.text.split('\n')

    if (lines.length <= RESULT_LINES) return <div className={styles.result}>{message.text}</div>

    return (
      <Fold
        summary={`${lines.length} lines of output`}
        body={message.text}
        bodyClass={styles.result}
      />
    )
  }

  if (message.role === 'thinking') {
    return <Fold summary="Thinking" body={message.text} bodyClass={styles.thought} />
  }

  if (message.role === 'error') {
    return <div className={styles.error}>{message.text}</div>
  }

  return (
    <div className={styles.assistant}>
      <Markdown text={message.text} />
      <CopyButton text={message.text} />
    </div>
  )
}

function Fold({ summary, body, bodyClass }: { summary: string; body: string; bodyClass: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.fold}>
      <button type="button" className={styles.foldToggle} onClick={() => setOpen(!open)}>
        <ChevronIcon size={10} className={open ? styles.foldMarkOpen : styles.foldMark} />
        {summary}
      </button>
      {open ? <div className={bodyClass}>{body}</div> : null}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)

  return (
    <button
      type="button"
      className={styles.copy}
      title={done ? 'Copied' : 'Copy'}
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
    >
      <CopyIcon size={12} />
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

function AttachmentBubble({ attachment }: { attachment: NonNullable<ChatMessage['attachment']> }) {
  const [source, setSource] = useState('')

  useEffect(() => {
    if (attachment.kind !== 'image' || !attachment.id) return

    let live = true

    void window.kvcode.attachRead(attachment.id).then((data) => {
      if (live && data) setSource(`data:image/png;base64,${data}`)
    })

    return () => {
      live = false
    }
  }, [attachment.id, attachment.kind])

  if (source) return <img className={styles.shot} src={source} alt={attachment.name} />

  return <div className={styles.file}>{attachment.name}</div>
}

const MAX_COMPOSER_HEIGHT = 168
const RESULT_LINES = 6

function Composer({ blocked }: { blocked: boolean }) {
  const area = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState('')
  const isRunning = useChatStore((state) => state.isRunning)
  const send = useChatStore((state) => state.send)
  const cancel = useChatStore((state) => state.cancel)
  const addAttachments = useChatStore((state) => state.addAttachments)
  const attachments = useChatStore((state) => state.attachments)

  useEffect(() => {
    const node = area.current

    if (!node) return

    node.style.height = '0px'

    const border = node.offsetHeight - node.clientHeight
    const height = Math.min(node.scrollHeight + border, MAX_COMPOSER_HEIGHT)

    node.style.height = `${height}px`
    node.style.overflowY = height < MAX_COMPOSER_HEIGHT ? 'hidden' : 'auto'
  }, [draft])

  function submit() {
    if (isRunning) {
      void cancel()
      return
    }

    const text = draft
    setDraft('')
    void send(text)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()
    submit()
  }

  async function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = [...event.clipboardData.files]

    if (files.length === 0) return

    event.preventDefault()
    addAttachments(await ingest(files))
  }

  async function onDrop(event: DragEvent<HTMLTextAreaElement>) {
    const files = [...event.dataTransfer.files]

    if (files.length === 0) return

    event.preventDefault()
    addAttachments(await ingest(files))
  }

  return (
    <div className={styles.field}>
      <textarea
        ref={area}
        className={styles.input}
        value={draft}
        rows={1}
        disabled={blocked}
        placeholder={isRunning ? 'Enter to stop' : 'Message'}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={(event) => void onPaste(event)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void onDrop(event)}
      />
      <button
        type="button"
        className={styles.enter}
        disabled={blocked || (!isRunning && draft.trim().length === 0 && attachments.length === 0)}
        title={isRunning ? 'Stop' : 'Send'}
        onClick={submit}
      >
        <EnterIcon size={13} />
      </button>
    </div>
  )
}

async function ingest(files: File[]): Promise<Attachment[]> {
  const paths: string[] = []
  const loose: File[] = []

  for (const file of files) {
    const path = window.kvcode.pathForFile(file)
    if (path) paths.push(path)
    else loose.push(file)
  }

  const out: Attachment[] = []

  if (paths.length > 0) out.push(...(await window.kvcode.attachPaths(paths)))

  for (const file of loose) {
    const buffer = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)

    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])

    out.push(await window.kvcode.attachBytes(file.name || 'pasted.png', btoa(binary)))
  }

  return out
}

function Attachments() {
  const attachments = useChatStore((state) => state.attachments)
  const remove = useChatStore((state) => state.removeAttachment)
  const model = useSettingsStore((state) => state.settings?.model ?? '')

  if (attachments.length === 0) return null

  return (
    <div className={styles.chips}>
      {attachments.map((item) => {
        const reason = unsupportedReason(model, item.kind)

        return (
          <span
            key={item.id}
            className={reason ? `${styles.chip} ${styles.chipBad}` : styles.chip}
            title={reason || item.name}
          >
            {item.name}
            <button type="button" className={styles.chipX} onClick={() => remove(item.id)}>
              <CloseIcon size={9} />
            </button>
          </span>
        )
      })}
    </div>
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
            <div className={styles.wordmark}>KVCode</div>
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
          <Attachments />
          <Composer blocked={Boolean(request)} />
          <ModelBar />
        </div>
      </div>
    </Panel>
  )
}
