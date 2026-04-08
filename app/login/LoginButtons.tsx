'use client'

import { signIn } from 'next-auth/react'

type Props = {
  /** ログイン後の遷移先（同一オリジンのパスのみ。ミドルウェアが付与する callbackUrl と揃える） */
  callbackUrl: string
}

export function LoginButtons({ callbackUrl }: Props) {
  return (
    <button
      type="button"
      className="rounded-2xl px-6 py-3 text-sm font-semibold shadow-sm"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border2)',
        color: 'var(--text)',
        cursor: 'pointer',
      }}
      onClick={() => void signIn('google', { callbackUrl })}
    >
      Google で続ける
    </button>
  )
}
