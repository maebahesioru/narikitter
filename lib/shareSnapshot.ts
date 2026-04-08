/** 共有スナップショットの型（URL フラグメント gzip JSON 等でクライアントのみ運用） */
export type BattleSnapshotV1 = {
  v: 1
  teamAIds: string[]
  teamBIds: string[]
  mode: string
  note: string
  customBrief: string
  /** バトル画面で共有したときのみ（長文結果も URL に載せずに共有可能） */
  resultText?: string
  resultThinking?: string
}

/** 個人チャットの共有（会話スナップショット） */
export type ChatSnapshotV1 = {
  v: 1
  kind: 'chat'
  userId: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    thinking?: string
    relatedQuestions?: string[]
  }>
}

export type ShareSnapshotPayloadV1 = BattleSnapshotV1 | ChatSnapshotV1

export function isBattleSnapshotV1(x: unknown): x is BattleSnapshotV1 {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    o.v === 1 &&
    Array.isArray(o.teamAIds) &&
    Array.isArray(o.teamBIds) &&
    typeof o.mode === 'string' &&
    typeof o.note === 'string' &&
    typeof o.customBrief === 'string'
  )
}

export function isChatSnapshotV1(x: unknown): x is ChatSnapshotV1 {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.v !== 1 || o.kind !== 'chat' || typeof o.userId !== 'string' || !Array.isArray(o.messages)) {
    return false
  }
  for (const m of o.messages) {
    if (!m || typeof m !== 'object') return false
    const msg = m as Record<string, unknown>
    if (typeof msg.id !== 'string' || (msg.role !== 'user' && msg.role !== 'assistant') || typeof msg.content !== 'string') {
      return false
    }
  }
  return true
}

export function isShareSnapshotPayloadV1(x: unknown): x is ShareSnapshotPayloadV1 {
  return isBattleSnapshotV1(x) || isChatSnapshotV1(x)
}
