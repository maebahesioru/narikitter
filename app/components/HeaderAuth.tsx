'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

type Props = {
  /** コンパクトに収める（チャット・バトルヘッダー用） */
  compact?: boolean
}

export function HeaderAuth({ compact = true }: Props) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <span className="text-xs tabular-nums" style={{ color: 'var(--text-faint)' }}>
        …
      </span>
    )
  }

  if (session?.user) {
    const name = session.user.name ?? session.user.email ?? 'User'
    const img = session.user.image
    return (
      <div className={`flex items-center gap-2 ${compact ? 'max-w-[10rem]' : ''}`}>
        {img ? (
          <img src={img} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
        ) : (
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: 'var(--bg-card2)' }}>
            G
          </span>
        )}
        <div className="min-w-0 flex flex-col items-start">
          <span className={`truncate text-xs font-medium ${compact ? 'max-w-[7rem]' : ''}`} style={{ color: 'var(--text-muted)' }} title={name}>
            {name}
          </span>
          <button
            type="button"
            className="text-[11px] underline p-0 m-0 bg-transparent border-0 cursor-pointer"
            style={{ color: 'var(--accent)' }}
            onClick={() => void signOut({ callbackUrl: '/login' })}
          >
            ログアウト
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
      style={{
        background: 'color-mix(in srgb, var(--accent) 15%, var(--bg-card))',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        cursor: 'pointer',
      }}
      onClick={() =>
        void signIn('google', {
          callbackUrl:
            typeof window !== 'undefined'
              ? `${window.location.pathname}${window.location.search}`
              : '/chat',
        })
      }
    >
      Google でログイン
    </button>
  )
}
