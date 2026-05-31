import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/clientIp'
import { isIpBlocked } from '@/lib/security/ipBlocklist'
import { DEVICE_COOKIE, readOrCreateDeviceId } from '@/lib/security/deviceCookie'

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

// 認証ラッパー撤廃 — 全アクセス許可
export function proxy(req: NextRequest) {
  const ip = getClientIp(req)

  if (isIpBlocked(ip)) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'アクセスが拒否されました' }, { status: 403 })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  const existingDid = req.cookies.get(DEVICE_COOKIE)?.value
  const { id: deviceId, isNew } = readOrCreateDeviceId(existingDid)

  const res = NextResponse.next()
  applyDeviceCookie(res, deviceId, isNew)
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|txt|json|xml)$).*)',
  ],
}
