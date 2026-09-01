export type AttachmentKind = 'image' | 'document' | 'text'

export interface Attachment {
  id: string
  name: string
  kind: AttachmentKind
  mediaType: string
  size: number
  path?: string
}

export const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp'
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS = 10
export const MAX_TEXT_CHARS = 200000

export function kindFor(name: string): AttachmentKind {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''

  if (IMAGE_TYPES[extension]) return 'image'
  if (extension === 'pdf') return 'document'

  return 'text'
}

export function mediaTypeFor(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''

  return IMAGE_TYPES[extension] ?? (extension === 'pdf' ? 'application/pdf' : 'text/plain')
}
