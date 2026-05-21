import Stripe from 'stripe'

let _stripe: Stripe | null = null

/** Stripe パッケージの types/apiVersion.d.ts と一致させる */
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-02-25.clover'

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  }
  return _stripe
}
