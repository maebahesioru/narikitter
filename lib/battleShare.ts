import {
  GZIP_V1_PREFIX,
  MAX_FRAGMENT_CHARS,
  compressJsonForUrl,
  decompressJsonFromUrlPayload,
  gzipJsonToBase64Url,
  gunzipBase64UrlToString,
} from '@/lib/gzipFragment'

const MODES = new Set([
  'battle',
  'manzai',
  'conte',
  'rap',
  'debate',
  'drama',
  'custom',
])

/** 共有で使う最短パス（`/l#bb=…` → 中身は `/battle` と同じ復元） */
export const SHORT_SHARE_BASE = '/l'

export type BattleShareState = {
  teamAIds: string[]
  teamBIds: string[]
  mode: string
  note: string
  customBrief: string
}

/** 短いキーのバンドル（v2）— Brotli/gzip で 1 フラグメントに収める */
export type BattleBundleV2 = {
  v: 2
  A: string[]
  B: string[]
  m: string
  n: string
  c: string
  t?: string
  k?: string
}

export function parseBattleSearchParams(search: string): BattleShareState | null {
  const q = search.startsWith('?') ? search.slice(1) : search
  const sp = new URLSearchParams(q)
  const a = sp.get('a')
  const b = sp.get('b')
  if (!a?.trim() || !b?.trim()) return null
  const teamAIds = [...new Set(a.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 5)
  const teamBIds = [...new Set(b.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 5)
  if (!teamAIds.length || !teamBIds.length) return null
  const rawMode = sp.get('m') || 'battle'
  const mode = MODES.has(rawMode) ? rawMode : 'battle'
  return {
    teamAIds,
    teamBIds,
    mode,
    note: sp.get('n') ?? '',
    customBrief: sp.get('c') ?? '',
  }
}

export function buildBattleSharePath(state: BattleShareState): string {
  const sp = new URLSearchParams()
  sp.set('a', state.teamAIds.join(','))
  sp.set('b', state.teamBIds.join(','))
  sp.set('m', state.mode)
  if (state.note.trim()) sp.set('n', state.note.trim())
  if (state.customBrief.trim()) sp.set('c', state.customBrief.trim())
  return `/battle?${sp.toString()}`
}

const RESULT_HASH_KEY = 'bt'

function encodeBattleResultHashFragmentLegacy(resultText: string, resultThinking: string): string | null {
  const payload = JSON.stringify({ t: resultText, k: resultThinking })
  const bytes = new TextEncoder().encode(payload)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  if (b64.length > MAX_FRAGMENT_CHARS) return null
  return `#${RESULT_HASH_KEY}=${b64}`
}

export async function encodeBattleResultHashFragmentAsync(
  resultText: string,
  resultThinking: string,
): Promise<string | null> {
  const payload = JSON.stringify({ t: resultText, k: resultThinking })
  const b64 = await gzipJsonToBase64Url(payload)
  if (b64) {
    const frag = `#${RESULT_HASH_KEY}=${GZIP_V1_PREFIX}${b64}`
    if (frag.length <= MAX_FRAGMENT_CHARS) return frag
  }
  return encodeBattleResultHashFragmentLegacy(resultText, resultThinking)
}

function decodeBattleResultHashFragmentLegacy(fullHash: string): { resultText: string; resultThinking: string } | null {
  if (!fullHash.startsWith('#')) return null
  const q = fullHash.slice(1)
  if (!q.startsWith(`${RESULT_HASH_KEY}=`)) return null
  const raw = q.slice(RESULT_HASH_KEY.length + 1)
  if (raw.startsWith(GZIP_V1_PREFIX)) return null
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - (b64.length % 4)) % 4
    const padded = b64 + '='.repeat(pad)
    const bin = atob(padded)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    const json = new TextDecoder().decode(out)
    const o = JSON.parse(json) as { t?: string; k?: string }
    return { resultText: typeof o.t === 'string' ? o.t : '', resultThinking: typeof o.k === 'string' ? o.k : '' }
  } catch {
    return null
  }
}

export async function decodeBattleResultHashFragmentAsync(
  fullHash: string,
): Promise<{ resultText: string; resultThinking: string } | null> {
  if (!fullHash.startsWith('#')) return null
  const q = fullHash.slice(1)
  if (!q.startsWith(`${RESULT_HASH_KEY}=`)) return null
  const raw = q.slice(RESULT_HASH_KEY.length + 1)
  if (raw.startsWith(GZIP_V1_PREFIX)) {
    const json = await gunzipBase64UrlToString(raw.slice(GZIP_V1_PREFIX.length))
    if (!json) return null
    try {
      const o = JSON.parse(json) as { t?: string; k?: string }
      return { resultText: typeof o.t === 'string' ? o.t : '', resultThinking: typeof o.k === 'string' ? o.k : '' }
    } catch {
      return null
    }
  }
  return decodeBattleResultHashFragmentLegacy(fullHash)
}

export function decodeBattleResultHashFragment(fullHash: string): { resultText: string; resultThinking: string } | null {
  return decodeBattleResultHashFragmentLegacy(fullHash)
}

export async function buildBattleSharePathWithOptionalResultAsync(
  state: BattleShareState,
  result?: { resultText: string; resultThinking: string },
): Promise<string> {
  const path = buildBattleSharePath(state)
  if (!result) return path
  const t = result.resultText.trim()
  const k = result.resultThinking.trim()
  if (!t && !k) return path
  const frag = await encodeBattleResultHashFragmentAsync(t, k)
  if (!frag) return path
  return `${path}${frag}`
}

const MAX_BUNDLE_NOTE = 900
const MAX_BUNDLE_BRIEF = 1400
const MAX_BUNDLE_RESULT_TEXT = 3200
const MAX_BUNDLE_RESULT_THINK = 1800

function clip(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/** `#bb=b1.|z1.` — チーム・モード・結果を 1 つに */
export async function encodeBattleBundleFragmentAsync(
  state: BattleShareState,
  result?: { resultText: string; resultThinking: string },
): Promise<string | null> {
  const bundle: BattleBundleV2 = {
    v: 2,
    A: state.teamAIds,
    B: state.teamBIds,
    m: state.mode,
    n: clip(state.note, MAX_BUNDLE_NOTE),
    c: clip(state.customBrief, MAX_BUNDLE_BRIEF),
  }
  if (result?.resultText?.trim()) bundle.t = clip(result.resultText, MAX_BUNDLE_RESULT_TEXT)
  if (result?.resultThinking?.trim()) bundle.k = clip(result.resultThinking, MAX_BUNDLE_RESULT_THINK)
  const comp = await compressJsonForUrl(JSON.stringify(bundle))
  if (!comp) return null
  const frag = `#bb=${comp}`
  if (frag.length > MAX_FRAGMENT_CHARS) return null
  return frag
}

export async function decodeBattleBundleFromHashAsync(fullHash: string): Promise<BattleBundleV2 | null> {
  if (!fullHash.startsWith('#')) return null
  const q = fullHash.slice(1)
  if (!q.startsWith('bb=')) return null
  const raw = q.slice(3)
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
    const b = o as BattleBundleV2
    if (b.v !== 2 || !Array.isArray(b.A) || !Array.isArray(b.B)) return null
    return b
  } catch {
    return null
  }
}

/** `/l#bb=…` 形式（フォールバック時は null） */
export async function buildBattleShareUrlCompactAsync(
  state: BattleShareState,
  result?: { resultText: string; resultThinking: string },
): Promise<string | null> {
  const frag = await encodeBattleBundleFragmentAsync(state, result)
  if (!frag) return null
  return `${SHORT_SHARE_BASE}${frag}`
}
