'use client'

import { UserInfo } from '../types'
import { handleImageError } from '../utils'

interface Props {
  userId: string
  userInfo: UserInfo
  suggestions: string[]
  setInput: (v: string) => void
}

export function WelcomeScreen({ userId, userInfo, suggestions, setInput }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full blur-xl opacity-40" style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
        <img
          src={userInfo.profileImageUrl || '/default-avatar.svg'}
          alt={userInfo.userName}
          className="relative w-24 h-24 rounded-full object-cover"
          style={{ border: '2px solid #a78bfa' }}
          onError={handleImageError}
        />
      </div>

      <h2 className="text-xl font-bold text-white mb-1">{userInfo.userName}</h2>
      <p className="text-xs mb-1" style={{ color: '#666' }}>@{userId}</p>
      <div className="text-xs px-3 py-1 rounded-full mb-6" style={{ background: '#1a1a1a', color: '#a78bfa' }}>AI</div>

      {userInfo.description && (
        <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: '#888' }}>"{userInfo.description}"</p>
      )}

      <p className="text-xs mb-3" style={{ color: '#555' }}>話しかけてみよう</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {suggestions.map((text, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInput(text)}
            className="px-4 py-2.5 rounded-xl text-sm text-left transition-all"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ccc', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#a78bfa'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.color = '#ccc' }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
