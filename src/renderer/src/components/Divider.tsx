import { useRef } from 'react'
import type { PointerEvent } from 'react'
import styles from './Divider.module.css'

interface DividerProps {
  label: string
  onResize: (delta: number) => void
}

export function Divider({ label, onResize }: DividerProps) {
  const lastX = useRef(0)

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    lastX.current = event.clientX
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return

    const delta = event.clientX - lastX.current
    lastX.current = event.clientX

    if (delta !== 0) onResize(delta)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      className={styles.divider}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}
