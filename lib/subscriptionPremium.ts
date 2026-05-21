import { getPrisma } from '@/lib/prisma'

/** Stripe の subscription.status で「チャット無制限」とみなす値 */
const PREMIUM_STATUSES = new Set(['active', 'trialing'])

export async function isStripeSubscriptionPremium(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const prisma = getPrisma()
  if (!prisma) return false
  const e = email.trim().toLowerCase()
  const row = await prisma.subscription.findUnique({
    where: { email: e },
    select: { status: true },
  })
  return Boolean(row && PREMIUM_STATUSES.has(row.status))
}
