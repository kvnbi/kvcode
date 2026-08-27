interface IconProps {
  size?: number
  className?: string
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    xmlns: 'http://www.w3.org/2000/svg'
  }
}

export function ChevronIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

export function FolderIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 4.2c0-.66.54-1.2 1.2-1.2h2.4l1.5 1.7h5.7c.66 0 1.2.54 1.2 1.2v5.9c0 .66-.54 1.2-1.2 1.2H3.2c-.66 0-1.2-.54-1.2-1.2Z" />
    </svg>
  )
}

export function FileIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 2H4.6c-.66 0-1.2.54-1.2 1.2v9.6c0 .66.54 1.2 1.2 1.2h6.8c.66 0 1.2-.54 1.2-1.2V5.4Z" />
      <path d="M9 2v3.4h3.6" />
    </svg>
  )
}

export function SaveIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.4 2.6h7l2.6 2.6v7.4c0 .55-.45 1-1 1H3.4c-.55 0-1-.45-1-1V3.6c0-.55.45-1 1-1Z" />
      <path d="M5.2 2.6v3.6h5.2V2.6M5.2 13.6V9.8h5.6v3.8" />
    </svg>
  )
}

export function CloseIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" />
    </svg>
  )
}
