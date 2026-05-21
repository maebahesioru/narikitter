/** 共有 URL 用: Brotli / gzip + base64url（b1. / z1. プレフィックス） */

export const GZIP_V1_PREFIX = 'z1.'
export const BROTLI_V1_PREFIX = 'b1.'

/** フラグメント全体の上限 */
export const MAX_FRAGMENT_CHARS = 80_000

export function uint8ToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToUint8(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (b64.length % 4)) % 4
  const padded = b64 + '='.repeat(pad)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** DOM の型定義が brotli を含まない環境でも実行時は対応ブラウザで動く */
type CompressionAlgo = 'gzip' | 'brotli'

async function compressRaw(algo: CompressionAlgo, rawBytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    const bytes = Uint8Array.from(rawBytes)
    const stream = new Blob([bytes]).stream().pipeThrough(
      new CompressionStream(algo as globalThis.CompressionFormat) as unknown as TransformStream<
        Uint8Array,
        Uint8Array
      >,
    )
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

async function decompressRaw(algo: CompressionAlgo, b64Part: string): Promise<string | null> {
  const buf = await decompressRawToBytes(algo, b64Part)
  if (!buf) return null
  return new TextDecoder().decode(buf)
}

async function decompressRawToBytes(algo: CompressionAlgo, b64Part: string): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const gzBytes = base64UrlToUint8(b64Part)
    const bytes = Uint8Array.from(gzBytes)
    const stream = new Blob([bytes]).stream().pipeThrough(
      new DecompressionStream(algo as globalThis.CompressionFormat) as unknown as TransformStream<
        Uint8Array,
        Uint8Array
      >,
    )
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

/** Brotli を優先し、不可なら gzip（返り値は `b1.` / `z1.` 付き） */
export async function compressJsonForUrl(json: string): Promise<string | null> {
  const rawBytes = new TextEncoder().encode(json)
  const br = await compressRaw('brotli', rawBytes)
  if (br) {
    const s = `${BROTLI_V1_PREFIX}${uint8ToBase64Url(br)}`
    if (s.length <= MAX_FRAGMENT_CHARS) return s
  }
  const gz = await compressRaw('gzip', rawBytes)
  if (gz) {
    const s = `${GZIP_V1_PREFIX}${uint8ToBase64Url(gz)}`
    if (s.length <= MAX_FRAGMENT_CHARS) return s
  }
  return null
}

/** `b1.` / `z1.` 付きペイロードを JSON 文字列へ */
export async function decompressJsonFromUrlPayload(prefixed: string): Promise<string | null> {
  if (prefixed.startsWith(BROTLI_V1_PREFIX)) {
    return decompressRaw('brotli', prefixed.slice(BROTLI_V1_PREFIX.length))
  }
  if (prefixed.startsWith(GZIP_V1_PREFIX)) {
    return decompressRaw('gzip', prefixed.slice(GZIP_V1_PREFIX.length))
  }
  return null
}

/** gzip の base64url のみ（`#bt=z1.` 等でプレフィックスを別付けする既存形式向け） */
export async function gzipJsonToBase64Url(json: string): Promise<string | null> {
  const rawBytes = new TextEncoder().encode(json)
  const gz = await compressRaw('gzip', rawBytes)
  if (!gz) return null
  return uint8ToBase64Url(gz)
}

/** gzip の base64url 部分のみを展開 */
export async function gunzipBase64UrlToString(b64Part: string): Promise<string | null> {
  return decompressRaw('gzip', b64Part)
}
