/** Yahoo!リアルタイム検索 API 経由のツイート取得（チャット・バトル共通）
 *
 * レート制限対策:
 * - 最大5ページ（200ツイート）までに制限し、250並列のDDoS級アクセスを防止
 * - リクエスト間に遅延を入れ、バーストトラフィックを避ける
 * - エラー時は指数バックオフでリトライ
 * - キャッシュTTLを24時間に延長
 */

export interface YahooEntry {
  id: string
  displayText: string
  createdAt: number
  userId: string
  screenName: string
  name: string
  profileImage: string
  replyCount: number
  rtCount: number
  qtCount: number
  likesCount: number
  inReplyTo: string
  replyMentions: string[]
  badge?: { type: string }
  quotedTweet?: { displayTextBody: string; name: string; screenName: string }
}

export const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://search.yahoo.co.jp/realtime/search',
}

// 最大取得ページ数（40件/ページ → 最大200件）
const MAX_PAGES = 5
// リクエスト間の遅延（ms）
const REQUEST_DELAY_MS = 500
// キャッシュTTL（24時間）
const CACHE_TTL = 1000 * 60 * 60 * 24
// リトライ設定
const MAX_RETRIES = 2
const BASE_BACKOFF_MS = 2000

const tweetCache = new Map<string, { entries: { own: YahooEntry[]; mentions: YahooEntry[] }; ts: number }>()

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<YahooEntry[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: YAHOO_HEADERS, signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const data = await res.json()
        return (data?.timeline?.entry || []) as YahooEntry[]
      }
      // 429 or 5xx → backoff and retry
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt)
          console.warn(`[Yahoo] ${res.status} on attempt ${attempt + 1}, backing off ${backoff}ms`)
          await delay(backoff)
          continue
        }
      }
      console.warn(`[Yahoo] HTTP ${res.status} for ${url}`)
      return []
    } catch (err) {
      if (attempt < retries) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt)
        console.warn(`[Yahoo] fetch error on attempt ${attempt + 1}, backing off ${backoff}ms: ${(err as Error).message}`)
        await delay(backoff)
        continue
      }
      console.error(`[Yahoo] fetch failed after ${retries + 1} attempts: ${(err as Error).message}`)
      return []
    }
  }
  return []
}

async function fetchPagesSequential(query: string): Promise<YahooEntry[]> {
  const starts = Array.from({ length: MAX_PAGES }, (_, i) => i * 40 + 1)
  const allEntries: YahooEntry[] = []

  for (const start of starts) {
    const params = new URLSearchParams({ p: query, results: '40', start: String(start) })
    const url = `https://search.yahoo.co.jp/realtime/api/v1/pagination?${params}`
    
    // 連続リクエストを避けるため、最初以外は遅延を入れる
    if (allEntries.length > 0 || start > 1) {
      await delay(REQUEST_DELAY_MS)
    }
    
    const entries = await fetchWithRetry(url)
    allEntries.push(...entries)
    
    // 空ページが来たらそれ以上取得しない（データがない）
    if (entries.length === 0 && start > 1) break
  }

  return allEntries
}

export async function fetchUserTweets(userId: string): Promise<{ own: YahooEntry[]; mentions: YahooEntry[] }> {
  const cached = tweetCache.get(userId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.entries

  // 逐次実行でサーバー負荷を分散
  const own = await fetchPagesSequential(`ID:${userId}`)
  
  // 自分のツイート取得後に少し間を空ける
  await delay(REQUEST_DELAY_MS * 2)
  
  const mentions = await fetchPagesSequential(`@${userId} -ID:${userId}`)
  
  const entries = { own, mentions }
  tweetCache.set(userId, { entries, ts: Date.now() })
  return entries
}
