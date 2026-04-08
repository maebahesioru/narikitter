import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://search.yahoo.co.jp/realtime/search',
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
        const res = await fetch(`https://search.yahoo.co.jp/realtime/api/v1/pagination?${params}`, { headers: YAHOO_HEADERS })
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
    const res = await fetch(`https://search.yahoo.co.jp/realtime/api/v1/pagination?${params}`, { headers: YAHOO_HEADERS })
    if (!res.ok) return NextResponse.json({ users: [] })

    const data = await res.json()
    const users = buildUsersFromYahooJson(data)
    return NextResponse.json({ users })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
