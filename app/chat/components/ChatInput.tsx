'use client'

import Link from 'next/link'
import { useRef } from 'react'
import type { ChatQuotaInfo } from '../hooks/useChat'

interface Props {
  input: string
  setInput: (v: string) => void
  isLoading: boolean
  userId: string
  uploadedFiles: File[]
  uploadedPreviews: string[]
  onSubmit: (e: React.FormEvent) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (i: number) => void
  chatQuota: ChatQuotaInfo | null
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  userId,
  uploadedFiles,
  uploadedPreviews,
  onSubmit,
  onFileUpload,
  onRemoveFile,
  chatQuota,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const atFreeLimit = Boolean(
    chatQuota &&
      !chatQuota.premium &&
      chatQuota.remaining !== null &&
      chatQuota.remaining <= 0,
  )

  return (
    <form onSubmit={onSubmit} className="px-4 py-3 flex-shrink-0 hairline-top" style={{ background: 'var(--bg)' }}>
      {chatQuota ? (
        <div className="mb-2 text-[11px] flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: 'var(--text-muted)' }}>
          {chatQuota.premium ? (
            <span>有料プラン · チャット無制限</span>
          ) : (
            <>
              <span>
                今月の送信: {chatQuota.used}/{chatQuota.limit}（無料）
                {chatQuota.remaining !== null && chatQuota.remaining > 0 ? (
                  <span style={{ color: 'var(--text-faint)' }}> · 残り {chatQuota.remaining} 通</span>
                ) : null}
              </span>
              <Link href="/pricing" className="underline" style={{ color: 'var(--accent)' }} prefetch={false}>
                有料プラン
              </Link>
            </>
          )}
        </div>
      ) : null}
      {uploadedFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {uploadedFiles.map((f, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
              {uploadedPreviews[i] && f.type.startsWith('image/')
                ? <img src={uploadedPreviews[i]} alt="" className="w-full h-full object-cover" />
                : <span className="text-3xl">📎</span>
              }
              <button type="button" onClick={() => onRemoveFile(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full text-[10px] text-white flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer' }}>×</button>
              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] truncate text-white" style={{ background: 'rgba(0,0,0,0.5)' }}>{f.name}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isLoading || atFreeLimit || uploadedFiles.length >= 5}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors"
          style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >📎</button>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*,text/*,.txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css,.xml,.yaml,.yml" onChange={onFileUpload} className="hidden" />

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(e as unknown as React.FormEvent) } }}
          placeholder={atFreeLimit ? '今月の無料枠を使い切りました' : `@${userId} に話しかける...`}
          disabled={isLoading || atFreeLimit}
          rows={1}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none resize-none disabled:opacity-50"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text)', maxHeight: 120, lineHeight: '1.5' }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
          onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 120)}px` }}
        />

        <button
          type="submit"
          disabled={isLoading || atFreeLimit || (!input.trim() && uploadedFiles.length === 0)}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all text-white font-bold"
          style={{ background: isLoading ? 'var(--border2)' : 'var(--accent)', border: 'none', cursor: 'pointer' }}
        >
          {isLoading ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin block" /> : '↑'}
        </button>
      </div>
    </form>
  )
}
