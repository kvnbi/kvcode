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

export function CloseIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" />
    </svg>
  )
}

export function GearIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M14.76 6.60 L14.76 9.40 L13.09 9.05 L12.35 10.85 L13.77 11.79 L11.79 13.77 L10.85 12.35 L9.05 13.09 L9.40 14.76 L6.60 14.76 L6.95 13.09 L5.15 12.35 L4.21 13.77 L2.23 11.79 L3.65 10.85 L2.91 9.05 L1.24 9.40 L1.24 6.60 L2.91 6.95 L3.65 5.15 L2.23 4.21 L4.21 2.23 L5.15 3.65 L6.95 2.91 L6.60 1.24 L9.40 1.24 L9.05 2.91 L10.85 3.65 L11.79 2.23 L13.77 4.21 L12.35 5.15 L13.09 6.95 Z" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  )
}

export function PlusIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 3.4v9.2M3.4 8h9.2" />
    </svg>
  )
}
