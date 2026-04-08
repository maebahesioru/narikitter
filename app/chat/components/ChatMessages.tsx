'use client'

import { useState } from 'react'
import { MarkdownBody } from '../../components/MarkdownBody'
import { CopyTextButton } from '../../components/CopyTextButton'
import { Message, UserInfo } from '../types'
import { handleImageError } from '../utils'

const copyIconClass =
  'absolute top-1/2 -translate-y-1/2 text-xs w-6 h-6 rounded-lg flex items-center justify-center transition-opacity opacity-70 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100'

interface Props {
  messages: Message[]
  userInfo: UserInfo | null
  isLoading: boolean
  setInput: (v: string) => void
  onEdit: (index: number, newContent: string) => void
}

export function ChatMessages({ messages, userInfo, isLoading, setInput, onEdit }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editSize, setEditSize] = useState<{ width: number; height: number } | null>(null)

  const startEdit = (i: number, content: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setEditSize({ width: rect.width, height: rect.height })
    setEditingIndex(i)
    setEditText(content)
  }

  const confirmEdit = (i: number) => {
    if (editText.trim()) onEdit(i, editText.trim())
    setEditingIndex(null)
  }

  return (
    <>
      {messages.map((msg, i) => (
        <div key={msg.id} className={`flex gap-2.5 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          {msg.role === 'assistant' && (
            <img src={userInfo?.profileImageUrl || '/default-avatar.svg'} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1" onError={handleImageError} />
          )}

          <div className={`max-w-[75%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.mediaFiles && msg.mediaFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {msg.mediaFiles.map((f, fi) =>
                  f.preview && f.mimeType.startsWith('image/') ? (
                    <img key={fi} src={f.preview} alt="" className="max-w-[200px] max-h-[150px] rounded-xl object-cover" />
                  ) : f.mimeType.startsWith('video/') ? (
                    <video key={fi} src={f.preview} className="max-w-[200px] max-h-[150px] rounded-xl" controls />
                  ) : (
                    <div key={fi} className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-sub)' }}>📎 {f.mimeType}</div>
                  )
                )}
              </div>
            )}
            {msg.textFiles && msg.textFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {msg.textFiles.map((f, fi) => (
                  <div key={fi} className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5" style={{ background: 'var(--bg-card)', color: 'var(--text-sub)' }}>
                    📄 {f.name}
                  </div>
                ))}
              </div>
            )}

            {msg.thinking && (
              <details className="w-full">
                <summary className="text-xs cursor-pointer px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>🤔 思考中...</summary>
                <div className="mt-1 px-3 py-2 rounded-xl text-xs leading-relaxed max-h-40 overflow-y-auto" style={{ background: 'var(--bg-card2)', color: 'var(--text-muted)', borderLeft: '2px solid var(--accent)' }}>
                  <MarkdownBody>{msg.thinking}</MarkdownBody>
                </div>
              </details>
            )}

            {msg.role === 'user' && editingIndex === i ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit(i) } if (e.key === 'Escape') setEditingIndex(null) }}
                  className="px-4 py-3 rounded-2xl text-sm outline-none resize-none"
                  style={{ background: 'var(--accent-dark)', border: '2px solid var(--accent)', color: '#fff', width: editSize?.width, minHeight: editSize?.height }}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditingIndex(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer' }}>キャンセル</button>
                  <button type="button" onClick={() => confirmEdit(i)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer' }}>送信</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="bubble px-4 py-3 rounded-2xl text-sm leading-relaxed break-words"
                  style={msg.role === 'user'
                    ? { background: 'var(--bubble-user)', color: '#fff', borderBottomRightRadius: 6 }
                    : { background: 'var(--bubble-ai)', color: 'var(--text)', borderBottomLeftRadius: 6 }
                  }
                >
                  {msg.role === 'assistant' ? (
                    <MarkdownBody>{msg.content || (isLoading && i === messages.length - 1 ? '▋' : '')}</MarkdownBody>
                  ) : msg.content}
                </div>
                {msg.role === 'assistant' && msg.content && !isLoading && (
                  <CopyTextButton
                    variant="icon"
                    text={msg.content}
                    className={`${copyIconClass} -right-7`}
                  />
                )}
                {msg.role === 'user' && msg.content && !isLoading && (
                  <CopyTextButton
                    variant="icon"
                    text={msg.content}
                    title="メッセージをコピー"
                    className={`${copyIconClass} -right-7`}
                  />
                )}
                {msg.role === 'user' && !isLoading && (
                  <button
                    type="button"
                    onClick={e => startEdit(i, msg.content, e.currentTarget.closest('.relative')?.querySelector('.bubble') as HTMLElement || e.currentTarget)}
                    className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-xs w-6 h-6 rounded-lg flex items-center justify-center transition-opacity"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >✏️</button>
                )}
              </div>
            )}

            {msg.role === 'assistant' &&
              msg.content.startsWith('⚠️') &&
              !isLoading &&
              i === messages.length - 1 &&
              i > 0 &&
              messages[i - 1]?.role === 'user' && (
                <div className="chat-retry-wrap">
                  <button
                    type="button"
                    className="chat-retry-btn"
                    onClick={() => onEdit(i - 1, messages[i - 1].content)}
                  >
                    再試行
                  </button>
                </div>
              )}

            {msg.relatedQuestions && msg.relatedQuestions.length > 0 && !isLoading && i === messages.length - 1 && (
              <div className="flex flex-col gap-1.5 mt-1 w-full">
                {msg.relatedQuestions.map((q, qi) => (
                  <button key={qi} type="button" onClick={() => setInput(q)}
                    className="text-left text-xs px-3 py-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--accent)', cursor: 'pointer' }}
                  >↳ {q}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
