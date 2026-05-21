import type { Message } from '@/app/chat/types'
import type { ChatSnapshotV1 } from '@/lib/shareSnapshot'
import { MAX_FRAGMENT_CHARS, compressJsonForUrl, decompressJsonFromUrlPayload } from '@/lib/gzipFragment'

/** 新: `#cc=b1.|z1.` 短キー JSON。旧: `#cs=z1.` も読む */
const CHAT_HASH_COMPACT = 'cc'
const CHAT_HASH_LEGACY = 'cs'

/** URL 長さ対策: 直近のみ・本文上限（思考・関連質問は共有に含めない） */
const MAX_SHARE_MESSAGES = 32
const MAX_CONTENT_CHARS = 2400

type ChatCompactV2 = {
  v: 2
  k: 'chat'
  u: string
  M: Array<{
    i: string
    r: 'user' | 'assistant'
    c: string
    t?: string
    q?: string[]
  }>
}

/** v3: タプル列 `[role 0|1, content]` — JSON が最も小さい */
type ChatCompactV3 = {
  v: 3
  u: string
  /** 0=user, 1=assistant */
  M: Array<[0 | 1, string]>
}

function truncateContent(s: string): string {
  if (s.length <= MAX_CONTENT_CHARS) return s
  return `${s.slice(0, MAX_CONTENT_CHARS - 1)}…`
}

/** 画像・添付は除外。共有 URL 短縮のため思考・関連質問も含めない */
export function slimMessagesForChatSnapshot(messages: Message[]): ChatSnapshotV1['messages'] {
  const slice =
    messages.length > MAX_SHARE_MESSAGES ? messages.slice(-MAX_SHARE_MESSAGES) : messages
  return slice.map((m, i) => ({
    id: `s${i}`,
    role: m.role,
    content: truncateContent(m.content),
  }))
}

function toCompactV3(payload: ChatSnapshotV1): ChatCompactV3 {
  return {
    v: 3,
    u: payload.userId,
    M: payload.messages.map(m => [m.role === 'user' ? 0 : 1, m.content] as [0 | 1, string]),
  }
}

function compactV2ToSnapshot(c: ChatCompactV2): ChatSnapshotV1 {
  return {
    v: 1,
    kind: 'chat',
    userId: c.u,
    messages: c.M.map(m => ({
      id: m.i,
      role: m.r,
      content: m.c,
      ...(m.t ? { thinking: m.t } : {}),
      ...(m.q?.length ? { relatedQuestions: m.q } : {}),
    })),
  }
}

function compactV3ToSnapshot(c: ChatCompactV3): ChatSnapshotV1 {
  return {
    v: 1,
    kind: 'chat',
    userId: c.u,
    messages: c.M.map((row, i) => ({
      id: `s${i}`,
      role: row[0] === 0 ? 'user' : 'assistant',
      content: row[1],
    })),
  }
}

/** Brotli / gzip + JSON */
export async function encodeChatSnapshotHashFragmentAsync(payload: ChatSnapshotV1): Promise<string | null> {
  const compact = toCompactV3(payload)
  const comp = await compressJsonForUrl(JSON.stringify(compact))
  if (!comp) return null
  const frag = `#${CHAT_HASH_COMPACT}=${comp}`
  if (frag.length > MAX_FRAGMENT_CHARS) return null
  return frag
}

export async function decodeChatSnapshotFromHashAsync(fullHash: string): Promise<ChatSnapshotV1 | null> {
  if (!fullHash.startsWith('#')) return null
  const q = fullHash.slice(1)

  if (q.startsWith(`${CHAT_HASH_COMPACT}=`)) {
    const raw = q.slice(CHAT_HASH_COMPACT.length + 1)
    const json = await decompressJsonFromUrlPayload(raw)
    if (!json) return null
    let o: unknown
    try {
      o = JSON.parse(json) as unknown
    } catch {
      return null
    }
    if (!o || typeof o !== 'object') return null
    try {
      const v = o as ChatCompactV3 | ChatCompactV2
      if ((v as ChatCompactV3).v === 3 && typeof (v as ChatCompactV3).u === 'string' && Array.isArray((v as ChatCompactV3).M)) {
        return compactV3ToSnapshot(v as ChatCompactV3)
      }
      if ((v as ChatCompactV2).v === 2 && 'k' in v && v.k === 'chat' && typeof v.u === 'string' && Array.isArray(v.M)) {
        return compactV2ToSnapshot(v)
      }
    } catch {
      return null
    }
    return null
  }

  if (q.startsWith(`${CHAT_HASH_LEGACY}=`)) {
    const raw = q.slice(CHAT_HASH_LEGACY.length + 1)
    const json = await decompressJsonFromUrlPayload(raw)
    if (!json) return null
    try {
      const o = JSON.parse(json) as ChatSnapshotV1
      if (o.v === 1 && o.kind === 'chat' && typeof o.userId === 'string' && Array.isArray(o.messages)) return o
    } catch {
      return null
    }
    return null
  }

  return null
}
