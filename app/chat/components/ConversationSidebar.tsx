'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Conversation, deleteConversation } from '../hooks/useHistory'
import { handleImageError } from '../utils'
import { AdSenseUnit } from '../../components/AdSenseUnit'
import { HeaderAuth } from '../../components/HeaderAuth'

interface Props {
  currentConvId: string
  currentUserId: string
  list: Conversation[]
  onRefresh: () => void
  isOpen: boolean
  onClose: () => void
  /** AdSense サイドバー用スロット（別ユニット）。未指定なら非表示 */
  sidebarAdSlot?: string
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'たった今'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`
  return `${Math.floor(diff / 86400000)}日前`
}

export function ConversationSidebar({ currentConvId, currentUserId, list, onRefresh, isOpen, onClose, sidebarAdSlot }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const navigate = (url: string) => {
    router.push(url)
    onClose()
  }

  const openConversation = (conv: Conversation) => {
    if (conv.id.startsWith('battle-')) {
      navigate(`/battle?conv=${encodeURIComponent(conv.id)}`)
    } else {
      navigate(`/chat?user=${encodeURIComponent(conv.userId)}&conv=${encodeURIComponent(conv.id)}`)
    }
  }

  const filtered = query.trim()
    ? list.filter(c =>
        c.userName.toLowerCase().includes(query.toLowerCase()) ||
        c.userId.toLowerCase().includes(query.toLowerCase()) ||
        c.messages.some(m => m.content.toLowerCase().includes(query.toLowerCase()))
      )
    : list

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteConversation(id)
    onRefresh()
    if (id === currentConvId) {
      router.push(id.startsWith('battle-') ? '/battle' : '/chat')
    }
  }

  const newConv = () => {
    if (currentUserId) {
      navigate(`/chat?user=${encodeURIComponent(currentUserId)}&conv=${Date.now()}`)
    } else {
      navigate('/chat')
    }
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={onClose} />}

      <aside
        className={`flex-shrink-0 flex flex-col overflow-hidden z-30 transition-transform duration-200 h-full max-h-full
          fixed inset-y-0 left-0 md:relative md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ width: 288, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-3 pt-3 pb-2 flex-shrink-0 hairline-bottom" style={{ background: 'var(--bg-sidebar)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-faint)' }}>会話履歴</span>
            <div className="flex gap-1">
              {currentUserId && (
                <button type="button" onClick={newConv}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--accent)', cursor: 'pointer' }}
                >＋ 同ユーザー</button>
              )}
              <button type="button" onClick={() => navigate('/chat')}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >別ユーザー</button>
            </div>
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍 履歴を検索..."
            className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text)' }}
          />
        </div>

        {sidebarAdSlot ? (
          <div className="flex-shrink-0 px-2 pb-2" style={{ background: 'var(--bg-sidebar)' }}>
            <div className="flex w-full justify-center py-2 px-1">
              <AdSenseUnit slot={sidebarAdSlot} width={260} height={250} />
            </div>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-faint)' }}>{query ? '見つかりませんでした' : '履歴なし'}</p>
          )}
          {filtered.map(conv => {
            const isBattle = conv.id.startsWith('battle-')
            return (
            <div
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors group relative"
              style={{
                background: conv.id === currentConvId ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                borderLeft: conv.id === currentConvId ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              <img src={conv.profileImageUrl || '/default-avatar.svg'} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={handleImageError} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {isBattle ? (conv.title || '⚔️ バトル') : conv.userName}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {isBattle ? conv.userName : (conv.title || conv.messages.at(-1)?.content?.slice(0, 30) || '...')}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{timeAgo(conv.updatedAt)}</div>
              </div>
              <button
                type="button"
                onClick={e => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 text-xs w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-opacity"
                style={{ background: 'var(--border2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >×</button>
            </div>
            )
          })}
        </div>

        <div className="flex-shrink-0 px-3 py-3 hairline-top" style={{ background: 'var(--bg-sidebar)' }}>
          <HeaderAuth compact />
        </div>
      </aside>
    </>
  )
}
