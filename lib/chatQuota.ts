import { getPrisma } from '@/lib/prisma'
import { isStripeSubscriptionPremium } from '@/lib/subscriptionPremium'
import { isHkmPremium } from '@/lib/hkmPremium'

/** 無料�Eラン: 1ユーザーあたり�E「ユーザー→AI」送信回数�E�編雁E�E再送も1回として数える�E�。月次でリセチE���E�EST�E�E*/
export const CHAT_FREE_MONTHLY_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.CHAT_FREE_MONTHLY_LIMIT || '30', 10) || 30,
)

/** 開発用: DATABASE_URL 未設定時のみ */
const memoryCounts = new Map<string, number>()

function quotaKey(email: string, month: string): string {
  return `${month}:${email.trim().toLowerCase()}`
}

function parsePremiumEmails(): Set<string> {
  const raw = process.env.PREMIUM_USER_EMAILS || ''
  return new Set(
    raw
      .split(/[,\s]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
  )
}

export async function isPremiumEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const e = email.trim().toLowerCase()
  if (parsePremiumEmails().has(e)) return true
  return isStripeSubscriptionPremium(email)
}

export function billingMonthKeyJst(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  return `${y}-${m}`
}

export type ChatQuotaStatus = {
  premium: boolean
  used: number
  limit: number
  /** 有料のとき�E null�E�無制限！E*/
  remaining: number | null
  month: string
}

async function getUsedCount(email: string, month: string): Promise<number> {
  const e = email.trim().toLowerCase()
  const prisma = getPrisma()
  if (prisma) {
    const row = await prisma.chatMonthlyUsage.findUnique({
      where: { email_month: { email: e, month } },
      select: { count: true },
    })
    return row?.count ?? 0
  }
  return memoryCounts.get(quotaKey(e, month)) ?? 0
}

async function incrementCount(email: string, month: string): Promise<number> {
  const e = email.trim().toLowerCase()
  const prisma = getPrisma()
  if (prisma) {
    const row = await prisma.chatMonthlyUsage.upsert({
      where: { email_month: { email: e, month } },
      create: { email: e, month, count: 1 },
      update: { count: { increment: 1 } },
    })
    return row.count
  }
  const k = quotaKey(e, month)
  const n = (memoryCounts.get(k) ?? 0) + 1
  memoryCounts.set(k, n)
  return n
}

async function decrementCount(email: string, month: string): Promise<void> {
  const e = email.trim().toLowerCase()
  const prisma = getPrisma()
  if (prisma) {
    await prisma.chatMonthlyUsage.updateMany({
      where: { email: e, month, count: { gt: 0 } },
      data: { count: { decrement: 1 } },
    })
    return
  }
  const k = quotaKey(e, month)
  memoryCounts.set(k, Math.max(0, (memoryCounts.get(k) ?? 0) - 1))
}

export async function getChatQuotaStatus(email: string | null | undefined): Promise<ChatQuotaStatus | null> {
  if (!email) return null
  const premium = await isPremiumEmail(email)
  const month = billingMonthKeyJst()
  if (premium) {
    return {
      premium: true,
      used: 0,
      limit: CHAT_FREE_MONTHLY_LIMIT,
      remaining: null,
      month,
    }
  }
  const used = await getUsedCount(email, month)
  const remaining = Math.max(0, CHAT_FREE_MONTHLY_LIMIT - used)
  return {
    premium: false,
    used,
    limit: CHAT_FREE_MONTHLY_LIMIT,
    remaining,
    month,
  }
}

/**
 * 送信直前に呼ぶ。上限趁E��なめEfalse�E�このときカウント�E増えなぁE��、E
 */
export async function tryConsumeChatMessage(email: string | null | undefined): Promise<
  | { ok: true; premium: true }
  | { ok: true; premium: false; used: number; remaining: number }
  | { ok: false; premium: false; used: number; limit: number; remaining: number }
> {
  if (!email) {
    return { ok: false, premium: false, used: 0, limit: CHAT_FREE_MONTHLY_LIMIT, remaining: 0 }
  }
  if (await isPremiumEmail(email)) {
    return { ok: true, premium: true }
  }
  const month = billingMonthKeyJst()
  const n = await incrementCount(email, month)
  if (n > CHAT_FREE_MONTHLY_LIMIT) {
    await decrementCount(email, month)
    const used = n - 1
    return {
      ok: false,
      premium: false,
      used,
      limit: CHAT_FREE_MONTHLY_LIMIT,
      remaining: 0,
    }
  }
  return {
    ok: true,
    premium: false,
    used: n,
    remaining: CHAT_FREE_MONTHLY_LIMIT - n,
  }
}
