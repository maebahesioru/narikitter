/** HttpOnly の第一者デバイス識別子（レート制限キー用。本人確認ではない） */
export const DEVICE_COOKIE = 'narikitter_did'

export function readOrCreateDeviceId(existing: string | undefined): { id: string; isNew: boolean } {
  if (existing && /^[a-zA-Z0-9-]{8,128}$/.test(existing)) {
    return { id: existing, isNew: false }
  }
  return { id: crypto.randomUUID(), isNew: true }
}
