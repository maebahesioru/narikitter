/**
 * Cloudflare Worker: Yahoo API リレー
 *
 * VPSのIPがYahooにブロックされた時のフォールバック用リレーサーバー。
 * CloudflareのエッジIPからYahooにリクエストするため、VPSとは別IPになる。
 *
 * デプロイ:
 *   cd workers/yahoo-relay && npx wrangler deploy
 *
 * 対応エンドポイント:
 *   /pagination?... → search.yahoo.co.jp/realtime/api/v1/pagination?...
 *   /search?...     → search.yahoo.co.jp/search?...
 */

const YAHOO_REALTIME = 'https://search.yahoo.co.jp/realtime/api/v1/pagination'
const YAHOO_WEB = 'https://search.yahoo.co.jp/search'

const JSON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://search.yahoo.co.jp/realtime/search',
}

const HTML_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Referer': 'https://search.yahoo.co.jp/',
}

export default {
  async fetch(request: Request): Promise<Response> {
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
    
    // パスに応じて転送先とヘッダーを切り替え
    let targetBase: string
    let headers: Record<string, string>
    if (url.pathname === '/search') {
      targetBase = YAHOO_WEB
      headers = HTML_HEADERS
    } else {
      targetBase = YAHOO_REALTIME
      headers = JSON_HEADERS
    }

    const yahooUrl = `${targetBase}${url.search}`

    try {
      const res = await fetch(yahooUrl, { headers })

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

      const ct = url.pathname === '/search' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8'
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': ct,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=30, s-maxage=60',
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
