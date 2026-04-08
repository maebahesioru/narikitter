import type { Message } from './types'

export function newMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** IndexedDB の旧データ（id なし）を読み込んだときに付与 */
export function ensureMessageIds(messages: Array<Omit<Message, 'id'> & { id?: string }>): Message[] {
  return messages.map(m => ({ ...m, id: m.id ?? newMessageId() }))
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  const allImages: string[] = JSON.parse(img.dataset.images || '[]')
  let idx = parseInt(img.dataset.index || '0') + 1
  while (idx < allImages.length) {
    const next = allImages[idx]
    if (next && next !== img.src) {
      img.dataset.index = idx.toString()
      img.src = next
      return
    }
    idx++
  }
  img.src = '/default-avatar.svg'
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
