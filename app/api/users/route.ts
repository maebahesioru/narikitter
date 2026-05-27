import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { YAHOO_HEADERS } from '@/lib/yahooRealtime'

const YAHOO_DIRECT_BASE = 'https://search.yahoo.co.jp/realtime/api/v1'
const YAHOO_PROXY_BASE = process.env.YAHOO_PROXY?.replace(/\/$/, '')

async function yahooFetch(pathAndQuery: string): Promise<Response> {
  const directRes = await fetch(`${YAHOO_DIRECT_BASE}${pathAndQuery}`, { headers: YAHOO_HEADERS })
  if (directRes.ok || !YAHOO_PROXY_BASE) return directRes
  return fetch(`${YAHOO_PROXY_BASE}${pathAndQuery}`, { headers: YAHOO_HEADERS })
}

type YahooTimelineEntry = { screenName: string; name: string; profileImage: string }

function buildUsersFromYahooJson(data: unknown) {
  const entries: YahooTimelineEntry[] = (data as { timeline?: { entry?: YahooTimelineEntry[] } })?.timeline?.entry || []

  const seen = new Set<string>()
  return entries
    .filter(e => {
      const id = e.screenName?.toLowerCase()
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map(e => ({
      userId: e.screenName,
      userName: e.name,
      profileImageUrl: e.profileImage,
      allProfileImages: [e.profileImage],
      tweetCount: 0,
    }))
}

// GET /api/users?q=userId — ユーザーIDで検索。random=1 でランダム1ユーザー（バトル用）
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (!rateLimit(ip, 30, 60_000)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const q = request.nextUrl.searchParams.get('q') || ''

  if (request.nextUrl.searchParams.get('random') === '1') {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        const rq = chars[Math.floor(Math.random() * chars.length)]
        const params = new URLSearchParams({ p: `ID:${rq}`, results: '40' })
        const res = await yahooFetch(`/pagination?${params}`)
        if (!res.ok) continue
        const data = await res.json()
        const users = buildUsersFromYahooJson(data)
        if (users.length) {
          const u = users[Math.floor(Math.random() * users.length)]
          return NextResponse.json(u)
        }
      }
      return NextResponse.json({ error: 'ユーザーが見つかりませんでした' }, { status: 404 })
    } catch (e: unknown) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  }

  if (!q.trim()) return NextResponse.json({ users: [] })

  try {
    const params = new URLSearchParams({ p: `ID:${q}`, results: '40' })
    const res = await yahooFetch(`/pagination?${params}`)
    if (!res.ok) return NextResponse.json({ users: [] })

    const data = await res.json()
    const users = buildUsersFromYahooJson(data)
    return NextResponse.json({ users })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
