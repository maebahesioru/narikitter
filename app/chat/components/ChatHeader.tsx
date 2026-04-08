'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserInfo } from '../types'
import { handleImageError } from '../utils'
import { useTheme } from '../../components/ThemeProvider'

interface Props {
  userId: string
  userInfo: UserInfo | null
  tweetCount: number | null
  onMenuClick: () => void
  onShareChat?: () => void
  shareDisabled?: boolean
  shareTitle?: string
}

export function ChatHeader({
  userId,
  userInfo,
  tweetCount,
  onMenuClick,
  onShareChat,
  shareDisabled,
  shareTitle = '会話を共有',
}: Props) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  return (
    <header className="flex items-center gap-3 px-4 py-3 flex-shrink-0 hairline-bottom" style={{ background: 'var(--bg)' }}>
      <button type="button" onClick={onMenuClick} className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 md:hidden" style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}>☰</button>
      <button type="button" onClick={() => router.push('/chat')} className="w-9 h-9 rounded-xl items-center justify-center text-sm flex-shrink-0 hidden md:flex" style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}>←</button>

      {userInfo ? (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img src={userInfo.profileImageUrl || '/default-avatar.svg'} alt={userInfo.userName} className="w-9 h-9 rounded-full object-cover" onError={handleImageError} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: 'var(--accent)', borderColor: 'var(--bg)' }} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{userInfo.userName}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>@{userId} · Narikitter{tweetCount !== null ? ` · ${tweetCount.toLocaleString()}件参照` : ''}</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: 'var(--border)' }} />
          <div className="space-y-1">
            <div className="w-24 h-3 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            <div className="w-16 h-2 rounded animate-pulse" style={{ background: 'var(--border)' }} />
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {onShareChat ? (
          <button
            type="button"
            onClick={onShareChat}
            disabled={shareDisabled}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm disabled:opacity-40"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: shareDisabled ? 'not-allowed' : 'pointer' }}
            title={shareTitle}
          >
            🔗
          </button>
        ) : null}
        <Link
          href="/battle"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)' }}
          title="なりきりバトル"
        >
          ⚔️
        </Link>
        <button type="button" onClick={toggle} className="w-9 h-9 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer' }} title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
