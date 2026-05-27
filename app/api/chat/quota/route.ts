import { NextResponse } from 'next/server'
import { getChatQuotaStatus } from '@/lib/chatQuota'

export async function GET() {
  // 認証撤廃 — 全ユーザー無制限
  return NextResponse.json({
    premium: true,
    used: 0,
    limit: 999999,
    remaining: 999999,
    month: new Date().toISOString().slice(0, 7),
  })
}
