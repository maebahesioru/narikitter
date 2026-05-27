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
 *   /pagination?...       → search.yahoo.co.jp/realtime/api/v1/pagination?...      (JSON)
 *   /realtime-search?...  → search.yahoo.co.jp/realtime/search?...                  (HTML, __NEXT_DATA__)
 *   /search?...           → search.yahoo.co.jp/search?...                          (HTML)
 */

const YAHOO_REALTIME_API   = 'https://search.yahoo.co.jp/realtime/api/v1/pagination'
const YAHOO_REALTIME_HTML  = 'https://search.yahoo.co.jp/realtime/search'
const YAHOO_WEB            = 'https://search.yahoo.co.jp/search'

const JSON_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://search.yahoo.co.jp/realtime/search',
}

const HTML_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Referer': 'https://search.yahoo.co.jp/',
}

const REALTIME_HTML_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
  'Referer': 'https://search.yahoo.co.jp/realtime/search',
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
    let contentType: string

    if (url.pathname === '/realtime-search') {
      targetBase = YAHOO_REALTIME_HTML
      headers = REALTIME_HTML_HEADERS
      contentType = 'text/html; charset=utf-8'
    } else if (url.pathname === '/search') {
      targetBase = YAHOO_WEB
      headers = HTML_HEADERS
      contentType = 'text/html; charset=utf-8'
    } else {
      // /pagination またはその他 → JSON API
      targetBase = YAHOO_REALTIME_API
      headers = JSON_HEADERS
      contentType = 'application/json; charset=utf-8'
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

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
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
