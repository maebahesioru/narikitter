/** Yahoo!リアルタイム検索 API 経由のツイート取得（チャット・バトル共通） */

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

const tweetCache = new Map<string, { entries: { own: YahooEntry[]; mentions: YahooEntry[] }; ts: number }>()
const CACHE_TTL = 1000 * 60 * 60

// YAHOO_PROXY環境変数が設定されてれば、生IPで失敗時にCloudflare Worker経由でリトライ
const YAHOO_DIRECT_BASE = "https://search.yahoo.co.jp/realtime/api/v1";
const YAHOO_PROXY_BASE = process.env.YAHOO_PROXY?.replace(/\/$/, "");

async function yahooFetch(pathAndQuery: string): Promise<Response> {
  // まず生IP
  const directRes = await fetch(`${YAHOO_DIRECT_BASE}${pathAndQuery}`, { headers: YAHOO_HEADERS });
  if (directRes.ok || !YAHOO_PROXY_BASE) return directRes;
  // ブロックされたらWorker経由でリトライ
  return fetch(`${YAHOO_PROXY_BASE}${pathAndQuery}`, { headers: YAHOO_HEADERS });
}

export async function fetchUserTweets(userId: string): Promise<{ own: YahooEntry[]; mentions: YahooEntry[] }> {
  const cached = tweetCache.get(userId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.entries

  const starts = Array.from({ length: 250 }, (_, i) => i * 40 + 1)

  const fetchPages = (query: string) =>
    Promise.all(
      starts.map(start => {
        const params = new URLSearchParams({ p: query, results: '40', start: String(start) })
        return yahooFetch(`/pagination?${params}`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => (d?.timeline?.entry || []) as YahooEntry[])
          .catch(() => [] as YahooEntry[])
      })
    ).then(pages => pages.flat())

  const [own, allMentions] = await Promise.all([fetchPages(`ID:${userId}`), fetchPages(`@${userId} -ID:${userId}`)])
  const entries = { own, mentions: allMentions }
  tweetCache.set(userId, { entries, ts: Date.now() })
  return entries
}
