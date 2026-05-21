import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getStripe } from '@/lib/stripe'

export async function POST() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const stripe = getStripe()
  const priceId = process.env.STRIPE_PRICE_ID
  let origin = process.env.NEXT_PUBLIC_BASE_URL || process.env.AUTH_URL
  if (!origin && process.env.VERCEL_URL) {
    origin = `https://${process.env.VERCEL_URL}`
  }
  if (!origin) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_BASE_URL または AUTH_URL を設定してください' },
      { status: 503 },
    )
  }
  if (!stripe || !priceId) {
    return NextResponse.json({ error: 'Stripe が未設定です（STRIPE_SECRET_KEY / STRIPE_PRICE_ID）' }, { status: 503 })
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    client_reference_id: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin.replace(/\/$/, '')}/pricing?checkout=success`,
    cancel_url: `${origin.replace(/\/$/, '')}/pricing?checkout=canceled`,
    metadata: { userEmail: email },
  })

  if (!checkoutSession.url) {
    return NextResponse.json({ error: 'Checkout URL を取得できませんでした' }, { status: 500 })
  }

  return NextResponse.json({ url: checkoutSession.url })
}
