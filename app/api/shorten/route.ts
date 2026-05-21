import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const MAX_URL_LEN = 500_000

type IsGdJson = { shorturl?: string; errorcode?: number; errormessage?: string }

type ShrtcoJson = {
  ok?: boolean
  result?: { full_short_link?: string }
}

function allowedOriginsForRequest(request: NextRequest): Set<string> {
  const out = new Set<string>()
  out.add(request.nextUrl.origin)
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (base) {
    try {
      out.add(new URL(base).origin)
    } catch {
      /* ignore */
    }
  }
  return out
}

function isOriginAllowed(target: URL, request: NextRequest): boolean {
  return allowedOriginsForRequest(request).has(target.origin)
}

async function tryShrtco(longUrl: string, signal: AbortSignal): Promise<string | null> {
  const apiUrl = `https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(longUrl)}`
  const res = await fetch(apiUrl, { method: 'GET', cache: 'no-store', signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const j = (await res.json()) as ShrtcoJson
  const link = j?.result?.full_short_link
  if (typeof link === 'string' && /^https?:\/\//i.test(link)) return link
  return null
}

async function tryTinyUrl(longUrl: string, signal: AbortSignal): Promise<string | null> {
  const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
  const res = await fetch(apiUrl, { method: 'GET', cache: 'no-store', signal })
  if (!res.ok) return null
  const text = (await res.text()).trim()
  if (/^https?:\/\//i.test(text)) return text
  return null
}

/** is.gd / v.gd / x.gd 互換の JSON API */
async function tryIsGdFamily(longUrl: string, signal: AbortSignal): Promise<string | null> {
  const urls = [
    `https://x.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`,
    `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`,
    `https://v.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`,
  ]
  for (const apiUrl of urls) {
    try {
      const res = await fetch(apiUrl, {
        method: 'GET',
        cache: 'no-store',
        signal,
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) continue
      const j = (await res.json()) as IsGdJson
      if (typeof j.shorturl === 'string' && /^https?:\/\//i.test(j.shorturl)) {
        return j.shorturl
      }
    } catch {
      continue
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`shorten:${ip}`, 40, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const urlRaw = body && typeof body === 'object' && 'url' in body ? (body as { url: unknown }).url : null
  const longUrl = typeof urlRaw === 'string' ? urlRaw.trim() : ''
  if (!longUrl || longUrl.length > MAX_URL_LEN) {
    return NextResponse.json({ error: 'bad url' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(longUrl)
  } catch {
    return NextResponse.json({ error: 'bad url' }, { status: 400 })
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ error: 'bad url' }, { status: 400 })
  }

  if (!isOriginAllowed(target, request)) {
    return NextResponse.json({ error: 'only same-origin URLs' }, { status: 403 })
  }

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 20_000)

  try {
    const { signal } = ac
    const short =
      (await tryTinyUrl(longUrl, signal)) ??
      (await tryShrtco(longUrl, signal)) ??
      (await tryIsGdFamily(longUrl, signal))

    if (short) {
      return NextResponse.json({ shortUrl: short })
    }
  } finally {
    clearTimeout(t)
  }

  return NextResponse.json({ error: 'shorten failed' }, { status: 502 })
}
