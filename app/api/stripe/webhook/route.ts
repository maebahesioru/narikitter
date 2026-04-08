import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getPrisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

/** Prisma の `Subscription` 型名と Stripe の型が衝突するため、必要フィールドだけ明示 */
type StripeSubscriptionPayload = {
  id: string
  customer: string | null | { id?: string }
  status: string
  current_period_end: number
}

async function upsertSubscription(prisma: PrismaClient, sub: StripeSubscriptionPayload) {
  const stripe = getStripe()
  if (!stripe) return
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (!customerId) return

  const cust = await stripe.customers.retrieve(customerId)
  if (cust.deleted) return
  const email = cust.email?.trim().toLowerCase()
  if (!email) return

  await prisma.subscription.upsert({
    where: { email },
    create: {
      email,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
    update: {
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  })
}

export async function POST(req: Request) {
  const stripe = getStripe()
  const wh = process.env.STRIPE_WEBHOOK_SECRET
  const prisma = getPrisma()
  if (!stripe || !wh || !prisma) {
    return NextResponse.json({ error: 'Stripe / DB / webhook secret not configured' }, { status: 503 })
  }

  const body = await req.text()
  const h = await headers()
  const sig = h.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, wh)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        if (session.mode !== 'subscription' || !session.subscription) break
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        await upsertSubscription(prisma, sub as unknown as StripeSubscriptionPayload)
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSubscriptionPayload
        await upsertSubscription(prisma, sub)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('[stripe webhook]', e)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
