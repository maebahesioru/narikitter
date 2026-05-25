/**
 * Cloudflare Worker: Yahoo Realtime Search API リレー
 *
 * VPSのIPがYahooにブロックされた時のリレーサーバー。
 * CloudflareのエッジIPからYahooにリクエストするため、VPSとは別IPになる。
 *
 * デプロイ:
 *   cd workers/yahoo-relay && npx wrangler deploy
 *
 * 使い方:
 *   Coolifyのなりきったー環境変数に追加:
 *   YAHOO_PROXY=https://yahoo-relay.hikamer.f5.si
 */

const YAHOO_BASE = 'https://search.yahoo.co.jp/realtime/api/v1/pagination'

export default {
  async fetch(request: Request): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const url = new URL(request.url)
    const yahooUrl = `${YAHOO_BASE}${url.search}`

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://search.yahoo.co.jp/realtime/search',
    }

    try {
      const res = await fetch(yahooUrl, { headers })

      // エラーレスポンスもそのまま返す
      const body = await res.text()

      if (!res.ok) {
        return new Response(body, {
          status: res.status,
          headers: {
            'Content-Type': res.headers.get('Content-Type') || 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'X-Relay-Status': String(res.status),
          },
        })
      }

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=30, s-maxage=60',
          // Cloudflare CDNにキャッシュさせる（同一クエリの重複リクエストを減らす）
          'CDN-Cache-Control': 'public, max-age=120',
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Relay fetch failed', detail: String(err) }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  },
}
