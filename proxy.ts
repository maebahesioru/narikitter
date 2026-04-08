import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimitByKey } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/security/clientIp'
import { isIpBlocked } from '@/lib/security/ipBlocklist'
import { DEVICE_COOKIE, readOrCreateDeviceId } from '@/lib/security/deviceCookie'

function numEnv(name: string, def: number): number {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v > 0 ? v : def
}

function applyDeviceCookie(res: NextResponse, id: string, isNew: boolean): void {
  if (!isNew) return
  res.cookies.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
    secure: process.env.NODE_ENV === 'production',
  })
}

export const proxy = auth((req: NextRequest) => {
  const ip = getClientIp(req)

  if (isIpBlocked(ip)) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'アクセスが拒否されました' }, { status: 403 })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  const existingDid = req.cookies.get(DEVICE_COOKIE)?.value
  const { id: deviceId, isNew } = readOrCreateDeviceId(existingDid)
  const throttleKey = `${ip}|${deviceId}`

  const windowMs = numEnv('SECURITY_AUTH_WINDOW_MS', 900_000)
  const postLimit = numEnv('SECURITY_AUTH_POST_PER_WINDOW', 25)
  const getLimit = numEnv('SECURITY_AUTH_GET_PER_WINDOW', 100)

  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    const method = req.method.toUpperCase()
    if (method === 'POST') {
      if (!rateLimitByKey(`auth:post:${throttleKey}`, postLimit, windowMs)) {
        const res = NextResponse.json(
          { error: 'ログイン試行が多すぎます。しばらく待ってから再度お試しください。' },
          { status: 429 },
        )
        applyDeviceCookie(res, deviceId, isNew)
        return res
      }
    } else if (method === 'GET') {
      if (!rateLimitByKey(`auth:get:${throttleKey}`, getLimit, windowMs)) {
        const res = NextResponse.json(
          { error: 'リクエストが多すぎます。しばらく待ってから再度お試しください。' },
          { status: 429 },
        )
        applyDeviceCookie(res, deviceId, isNew)
        return res
      }
    }
  }

  const res = NextResponse.next()
  applyDeviceCookie(res, deviceId, isNew)
  return res
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|txt|json|xml)$).*)',
  ],
}
