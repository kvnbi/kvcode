import { useEffect, useState } from 'react'
import { looksRisky } from '@shared/permissions'
import type { PermissionDecision, PermissionRequest } from '@shared/permissions'
import styles from './PermissionPrompt.module.css'

const TITLES: Record<PermissionRequest['kind'], string> = {
  read: 'Read a file outside your open folders',
  write: 'Write a file outside your open folders',
  command: 'Run a command on your computer'
}

const SESSION_LABELS: Record<PermissionRequest['kind'], string> = {
  read: 'Allow this folder for the session',
  write: 'Allow this folder for the session',
  command: 'Allow all commands for the session'
}

export function PermissionPrompt() {
  const [queue, setQueue] = useState<PermissionRequest[]>([])

  useEffect(() => {
    const stop = window.kvcode.onPermissionRequest((request) =>
      setQueue((all) => [...all, request])
    )

    return () => {
      stop()
    }
  }, [])

  const request = queue[0]

  if (!request) return null

  function decide(decision: PermissionDecision) {
    void window.kvcode.replyPermission({ id: request.id, decision })
    setQueue((all) => all.slice(1))
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-label="Permission request">
        <div className={styles.header}>{TITLES[request.kind]}</div>

        <div className={styles.body}>
          <div className={styles.detail}>{request.detail}</div>
          {request.cwd ? <div className={styles.cwd}>in {request.cwd}</div> : null}
          {looksRisky(request.detail) ? (
            <div className={styles.warning}>This can change or expose things outside this project.</div>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.deny} onClick={() => decide('deny')}>
            Deny
          </button>
          <button type="button" className={styles.action} onClick={() => decide('session')}>
            {SESSION_LABELS[request.kind]}
          </button>
          <button type="button" className={styles.allow} onClick={() => decide('once')}>
            Allow once
          </button>
        </div>
      </div>
    </div>
  )
}
