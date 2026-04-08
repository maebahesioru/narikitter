'use client'

import { UserInfo } from '../types'
import { handleImageError } from '../utils'

interface Props {
  userId: string
  userInfo: UserInfo | null
  suggestions: string[]
  setInput: (v: string) => void
}

export function UserPanel({ userId, userInfo, suggestions, setInput }: Props) {
  return (
    <aside className="w-64 flex-shrink-0 flex flex-col overflow-y-auto" style={{ background: '#111', borderRight: '1px solid #1e1e1e' }}>
      {/* プロフィール */}
      <div className="p-5 flex flex-col items-center text-center" style={{ borderBottom: '1px solid #1e1e1e' }}>
        {userInfo ? (
          <>
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full blur-lg opacity-30" style={{ background: '#a78bfa' }} />
              <img
                src={userInfo.profileImageUrl || '/default-avatar.svg'}
                alt={userInfo.userName}
                className="relative w-20 h-20 rounded-full object-cover"
                style={{ border: '2px solid #a78bfa' }}
                onError={handleImageError}
              />
            </div>
            <div className="font-bold text-white text-sm mb-0.5">{userInfo.userName}</div>
            <div className="text-xs mb-3" style={{ color: '#555' }}>@{userId}</div>
            {userInfo.description && (
              <p className="text-xs leading-relaxed" style={{ color: '#777' }}>{userInfo.description}</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-20 h-20 rounded-full animate-pulse" style={{ background: '#1e1e1e' }} />
            <div className="w-24 h-3 rounded animate-pulse" style={{ background: '#1e1e1e' }} />
            <div className="w-16 h-2 rounded animate-pulse" style={{ background: '#1e1e1e' }} />
          </div>
        )}
      </div>

      {/* サジェスト */}
      <div className="p-4 flex flex-col gap-2">
        <p className="text-xs mb-1" style={{ color: '#444' }}>話題のきっかけ</p>
        {suggestions.map((text, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInput(text)}
            className="text-left text-xs px-3 py-2.5 rounded-xl transition-all w-full"
            style={{ background: '#1a1a1a', border: '1px solid #222', color: '#999', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#a78bfa'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#222'; (e.currentTarget as HTMLButtonElement).style.color = '#999' }}
          >
            {text}
          </button>
        ))}
      </div>
    </aside>
  )
}
