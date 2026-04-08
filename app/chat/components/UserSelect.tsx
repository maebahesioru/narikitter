'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserOption } from '../types'
import { handleImageError } from '../utils'
import { Conversation } from '../hooks/useHistory'

interface Props {
  userSearch: string
  setUserSearch: (v: string) => void
  userList: UserOption[]
  loadingUsers: boolean
  recentConvs: Conversation[]
}

export function UserSelect({ userSearch, setUserSearch, userList, loadingUsers, recentConvs }: Props) {
  const router = useRouter()
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10 mt-24">
          <div className="text-5xl mb-4">🎭</div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>なりきったー</h1>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Narikitter — X ユーザーのツイートを参考に、なりきりで会話できます</p>
          <Link
            href="/battle"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--accent)' }}
          >
            ⚔️ なりきりバトル
          </Link>
        </div>

        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          <input
            type="text"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            placeholder="ユーザーIDを入力 (例: nhk_news)"
            autoFocus
            className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm outline-none transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
          />
        </div>

        {!userSearch && recentConvs.length > 0 && (() => {
          const seen = new Set<string>()
          const recent = recentConvs.filter(c => { if (seen.has(c.userId)) return false; seen.add(c.userId); return true }).slice(0, 6)
          return (
            <div className="w-full max-w-sm mb-6">
              <p className="text-xs mb-3 text-left" style={{ color: 'var(--text-faint)' }}>最近話したユーザー</p>
              <div className="flex flex-col gap-2">
                {recent.map(conv => (
                  <div
                    key={conv.userId}
                    onClick={() => router.push(`/chat?user=${encodeURIComponent(conv.userId)}`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)' }}
                  >
                    <img src={conv.profileImageUrl || '/default-avatar.svg'} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={handleImageError} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{conv.userName}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>@{conv.userId}</div>
                    </div>
                    <span className="ml-auto text-sm" style={{ color: 'var(--text-faint)' }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {loadingUsers && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loadingUsers && userSearch && userList.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--text-faint)' }}>ユーザーが見つかりませんでした</p>
        )}

        {userList.length > 0 && (
          <div className="flex flex-col gap-2">
            {userList.map(user => (
              <button
                key={user.userId}
                type="button"
                onClick={() => router.push(`/chat?user=${encodeURIComponent(user.userId)}`)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all w-full"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', cursor: 'pointer', color: 'var(--text)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
              >
                <img
                  src={user.profileImageUrl || '/default-avatar.svg'}
                  alt={user.userName}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                  data-images={JSON.stringify(user.allProfileImages || [])}
                  data-index="0"
                  onError={handleImageError}
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{user.userName}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{user.userId}</div>
                </div>
                <span className="ml-auto text-lg">→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="py-6 text-center flex flex-wrap gap-x-4 gap-y-2 justify-center">
        <a href="/terms" className="text-xs" style={{ color: 'var(--text-faint)' }}>利用規約</a>
        <a href="/privacy" className="text-xs" style={{ color: 'var(--text-faint)' }}>プライバシーポリシー</a>
        <a href="/tokushoho" className="text-xs" style={{ color: 'var(--text-faint)' }}>特定商取引法に基づく表記</a>
      </div>
    </div>
  )
}
