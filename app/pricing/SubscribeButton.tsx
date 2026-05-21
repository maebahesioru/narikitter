'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

export function SubscribeButton() {
  const { status } = useSession()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function go() {
    setErr(null)
    setLoading(true)
    try {
      const r = await fetch('/api/stripe/checkout', { method: 'POST' })
      const j = (await r.json()) as { error?: string; url?: string }
      if (!r.ok) {
        setErr(typeof j.error === 'string' ? j.error : 'エラーが発生しました')
        return
      }
      if (j.url) window.location.href = j.url
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <p className="text-xs" style={{ color: 'var(--text-faint)' }}>…</p>
  }
  if (status === 'unauthenticated') {
    return <p className="text-xs">ログインすると Stripe 決済に進めます。</p>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void go()}
        disabled={loading}
        className="rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"
        style={{
          background: 'color-mix(in srgb, var(--accent) 18%, var(--bg-card))',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? '処理中…' : 'Stripe で有料プランに申し込む'}
      </button>
      {err ? (
        <p className="text-xs mt-2" style={{ color: 'var(--text-sub)' }}>
          {err}
        </p>
      ) : null}
    </div>
  )
}
