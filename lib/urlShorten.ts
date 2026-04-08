/**
 * 同一オリジンの `/api/shorten` 経由で短縮する（サーバー側プロキシ）。
 * 長いフラグメント付き URL も送れるよう、長さチェックは API 側に任せる。
 */
const MAX_URL_LEN_FOR_SHORTEN = 500_000

export async function tryShortenUrlWithPublicServices(longUrl: string): Promise<string | null> {
  if (typeof fetch === 'undefined' || longUrl.length > MAX_URL_LEN_FOR_SHORTEN) return null

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const j = (await res.json()) as { shortUrl?: string }
    if (typeof j.shortUrl === 'string' && /^https?:\/\//i.test(j.shortUrl)) {
      return j.shortUrl
    }
  } catch {
    return null
  }

  return null
}
