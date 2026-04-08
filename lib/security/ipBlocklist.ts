/**
 * SECURITY_IP_BLOCKLIST（カンマ区切り）
 * 例: 198.51.100.0/24,203.0.113.5
 * IPv4 のみ（IPv6 は将来拡張）
 */

function parseIpv4ToInt(s: string): number | null {
  const parts = s.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const v = Number(p)
    if (!Number.isInteger(v) || v < 0 || v > 255) return null
    n = (n << 8) | v
  }
  return n >>> 0
}

function parseRule(rule: string): { kind: 'exact'; ip: string } | { kind: 'cidr'; base: number; bits: number } | null {
  const t = rule.trim()
  if (!t) return null
  const slash = t.indexOf('/')
  if (slash === -1) {
    if (!parseIpv4ToInt(t)) return null
    return { kind: 'exact', ip: t }
  }
  const addr = t.slice(0, slash).trim()
  const bits = Number(t.slice(slash + 1).trim())
  const base = parseIpv4ToInt(addr)
  if (base === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return null
  return { kind: 'cidr', base, bits }
}

function ipv4InCidr(ipInt: number, base: number, bits: number): boolean {
  if (bits === 0) return true
  const mask = bits === 32 ? 0xffffffff : ((0xffffffff << (32 - bits)) >>> 0)
  return (ipInt & mask) === (base & mask)
}

let cachedRules: NonNullable<ReturnType<typeof parseRule>>[] | null = null
let cachedRaw = ''

function rules(): NonNullable<ReturnType<typeof parseRule>>[] {
  const raw = process.env.SECURITY_IP_BLOCKLIST || ''
  if (cachedRules && cachedRaw === raw) return cachedRules
  cachedRaw = raw
  const parsed = raw
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseRule)
    .filter((r): r is NonNullable<typeof r> => r !== null)
  cachedRules = parsed
  return parsed
}

export function isIpBlocked(ip: string): boolean {
  if (ip === 'unknown') return false
  const ipInt = parseIpv4ToInt(ip)
  if (ipInt === null) return false

  for (const r of rules()) {
    if (r.kind === 'exact') {
      if (ip === r.ip) return true
      continue
    }
    if (ipv4InCidr(ipInt, r.base, r.bits)) return true
  }
  return false
}
