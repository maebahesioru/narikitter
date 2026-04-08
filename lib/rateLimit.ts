// In-memory rate limiter (per IP)
// Resets window on each interval

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = store.get(ip)

  if (!bucket || now > bucket.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

/** 任意のキー（例: IP+デバイス ID）で同じロジックを使う */
export function rateLimitByKey(key: string, limit: number, windowMs: number): boolean {
  return rateLimit(`k:${key}`, limit, windowMs)
}
