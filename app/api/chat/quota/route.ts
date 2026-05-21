import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getChatQuotaStatus } from '@/lib/chatQuota'

export async function GET() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const q = await getChatQuotaStatus(email)
  if (!q) {
    return NextResponse.json({ error: 'quota unavailable' }, { status: 500 })
  }

  return NextResponse.json({
    premium: q.premium,
    used: q.used,
    limit: q.limit,
    remaining: q.remaining,
    month: q.month,
  })
}
