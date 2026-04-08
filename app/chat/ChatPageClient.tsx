'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { useChat, useUserList } from './hooks/useChat'
import { useConversationList } from './hooks/useHistory'
import { UserSelect } from './components/UserSelect'
import { ChatHeader } from './components/ChatHeader'
import { ChatMessages } from './components/ChatMessages'
import { ChatInput } from './components/ChatInput'
import { ConversationSidebar } from './components/ConversationSidebar'
import { useTheme } from '../components/ThemeProvider'
import { AdsenseHeader } from '../components/AdsenseHeader'
import { AdsenseOverlay } from '../components/AdsenseOverlay'
import { AdsenseRightRail } from '../components/AdsenseRightRail'
import { AdSenseUnit } from '../components/AdSenseUnit'
import { adsenseSlots, needsMobileOverlayPadding, rightRailPaddingClass } from '@/lib/adsense'
import type { ChatSnapshotV1 } from '@/lib/shareSnapshot'
import { SHORT_SHARE_BASE } from '@/lib/battleShare'
import {
  encodeChatSnapshotHashFragmentAsync,
  decodeChatSnapshotFromHashAsync,
  slimMessagesForChatSnapshot,
} from '@/lib/chatShare'
import { tryShortenUrlWithPublicServices } from '@/lib/urlShorten'
import type { Message } from './types'

type ChatContentProps = {
  userId: string
  convId?: string
  initialMessages?: Message[]
  rightRailPad: string
}

function ChatContent({ userId, convId, initialMessages, rightRailPad }: ChatContentProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const { userList, loadingUsers } = useUserList(userId, userSearch)
  const { list, refresh } = useConversationList()
  const {
    messages,
    input,
    setInput,
    isLoading,
    userInfo,
    tweetCount,
    uploadedFiles,
    uploadedPreviews,
    randomSuggestions,
    handleFileUpload,
    removeFile,
    sendMessage,
    editMessage,
    convId: activeConvId,
    chatQuota,
  } = useChat(userId, convId, refresh, initialMessages)

  const { theme, toggle } = useTheme()
  const [shareHint, setShareHint] = useState<string | null>(null)

  const shareChat = useCallback(async () => {
    if (!userId || messages.length === 0) return

    const payload: ChatSnapshotV1 = {
      v: 1,
      kind: 'chat',
      userId,
      messages: slimMessagesForChatSnapshot(messages),
    }

    const origin = window.location.origin
    const frag = await encodeChatSnapshotHashFragmentAsync(payload)
    if (!frag) {
      setShareHint('会話が長すぎて URL に収まりません（テキスト量を減らしてください）')
      return
    }
    let url = `${origin}${SHORT_SHARE_BASE}${frag}`
    const shortUrl = await tryShortenUrlWithPublicServices(url)
    if (shortUrl) url = shortUrl

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'なりきったー チャット', url })
        setShareHint('共有しました')
      } else {
        await navigator.clipboard.writeText(url)
        setShareHint('URLをコピーしました')
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        setShareHint('URLをコピーしました')
      } catch {
        setShareHint('コピーに失敗しました')
      }
    }
  }, [userId, messages])

  useEffect(() => {
    if (!shareHint) return
    const t = setTimeout(() => setShareHint(null), 5000)
    return () => clearTimeout(t)
  }, [shareHint])

  /**
   * ?user= の有無で早期 return しない。
   * 広告（AdSense）を同一ツリー位置に保ち、レイアウトのちらつきを抑える。
   */
  return (
    <div className="relative flex flex-1 flex-col min-h-0 min-w-0 w-full" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0">
        <ConversationSidebar
          currentConvId={userId ? activeConvId : ''}
          currentUserId={userId}
          list={list}
          onRefresh={refresh}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sidebarAdSlot={adsenseSlots.sidebar || undefined}
        />

        <div className={`flex flex-1 min-w-0 min-h-0 ${rightRailPad}`}>
          <div
            className={`flex flex-col flex-1 min-h-0 min-w-0 ${userId ? 'overflow-hidden' : 'overflow-y-auto'} ${needsMobileOverlayPadding() ? 'pb-[50px] md:pb-0' : ''}`}
          >
            {adsenseSlots.aboveToolbar ? (
              <div className="flex w-full justify-center">
                <AdSenseUnit slot={adsenseSlots.aboveToolbar} format="horizontal" fullWidthResponsive style={{ minHeight: 90 }} />
              </div>
            ) : null}

            {userId ? (
              <>
                <ChatHeader
                  userId={userId}
                  userInfo={userInfo}
                  tweetCount={tweetCount}
                  onMenuClick={() => setSidebarOpen(o => !o)}
                  onShareChat={shareChat}
                  shareDisabled={messages.length === 0}
                />
                {shareHint ? (
                  <div className="px-4 py-1.5 text-xs text-center hairline-bottom" style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}>
                    {shareHint}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 hairline-bottom flex-shrink-0" style={{ background: 'var(--bg)' }}>
                <button type="button" onClick={() => setSidebarOpen(o => !o)} className="w-9 h-9 rounded-xl flex items-center justify-center md:hidden" style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}>☰</button>
                <div className="hidden md:block" />
                <div className="flex items-center gap-1">
                  <Link href="/battle" className="w-9 h-9 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)' }} title="なりきりバトル">
                    ⚔️
                  </Link>
                  <button type="button" onClick={toggle} className="w-9 h-9 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer' }} title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>{theme === 'dark' ? '☀️' : '🌙'}</button>
                </div>
              </div>
            )}

            <AdsenseHeader />

            {userId ? (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 min-h-0">
                  {messages.length === 0 && (
                    <>
                      <div className="flex flex-col items-center justify-center flex-1 gap-3">
                        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>@{userId} に話しかけてみよう</p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-md">
                          {randomSuggestions.map((s, i) => (
                            <button key={i} type="button" onClick={() => setInput(s)}
                              className="text-xs px-3 py-2 rounded-xl transition-colors"
                              style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >{s}</button>
                          ))}
                        </div>
                      </div>
                      {adsenseSlots.banner320 ? (
                        <div className="flex justify-center">
                          <AdSenseUnit slot={adsenseSlots.banner320} width={320} height={100} />
                        </div>
                      ) : null}
                    </>
                  )}
                  <ChatMessages messages={messages} userInfo={userInfo} isLoading={isLoading} setInput={setInput} onEdit={editMessage} />
                  {isLoading && (
                    <div className="flex gap-2.5 items-center">
                      <img src={userInfo?.profileImageUrl || '/default-avatar.svg'} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      <div className="px-4 py-3 rounded-2xl text-sm flex gap-1 items-center" style={{ background: 'var(--bubble-ai)', borderBottomLeftRadius: 6 }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                  {adsenseSlots.mrec ? (
                    <div className="flex justify-center py-4">
                      <AdSenseUnit slot={adsenseSlots.mrec} width={300} height={250} />
                    </div>
                  ) : null}
                </div>
                <ChatInput
                  input={input}
                  setInput={setInput}
                  isLoading={isLoading}
                  userId={userId}
                  uploadedFiles={uploadedFiles}
                  uploadedPreviews={uploadedPreviews}
                  onSubmit={sendMessage}
                  onFileUpload={handleFileUpload}
                  onRemoveFile={removeFile}
                  chatQuota={chatQuota}
                />
              </>
            ) : (
              <>
                {adsenseSlots.banner320 ? (
                  <div className="flex justify-center py-3">
                    <AdSenseUnit slot={adsenseSlots.banner320} width={320} height={100} />
                  </div>
                ) : null}
                <UserSelect userSearch={userSearch} setUserSearch={setUserSearch} userList={userList} loadingUsers={loadingUsers} recentConvs={list} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type ClientProps = { userId: string; convId?: string }

export default function ChatPageClient({ userId, convId }: ClientProps) {
  const rightRailPad = rightRailPaddingClass()

  const [hashSnap, setHashSnap] = useState<ChatSnapshotV1 | null>(null)
  const [hashErr, setHashErr] = useState<string | null>(null)
  /** true = 通常表示可能。共有ハッシュのデコードが必要なときだけ一時的に false */
  const [hashChecked, setHashChecked] = useState(true)
  const snapConvIdRef = useRef('')

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const h = window.location.hash
    if (h.startsWith('#cc=') || h.startsWith('#cs=')) {
      setHashChecked(false)
    }
  }, [])

  /** `#cc=` / `#cs=` の共有を復元 */
  useEffect(() => {
    if (hashChecked) return
    const hash = window.location.hash
    let cancelled = false
    ;(async () => {
      const data = await decodeChatSnapshotFromHashAsync(hash)
      if (cancelled) return
      if (!data) {
        setHashErr('共有データを読み取れませんでした')
        setHashChecked(true)
        return
      }
      const cid = `snap-${Date.now()}`
      snapConvIdRef.current = cid
      setHashSnap(data)
      const url = new URL(window.location.href)
      url.hash = ''
      url.searchParams.set('user', data.userId)
      url.searchParams.set('conv', cid)
      window.history.replaceState({}, '', url.toString())
      setHashChecked(true)
    })()
    return () => {
      cancelled = true
    }
  }, [hashChecked])

  const effectiveUserId = hashSnap?.userId ?? userId
  const effectiveConvId = hashSnap ? snapConvIdRef.current || undefined : convId
  const initialMessages = hashSnap !== null ? hashSnap.messages : undefined

  let main: ReactNode
  if (!hashChecked) {
    main = (
      <div className={`flex flex-1 flex-col min-h-0 items-center justify-center gap-2 ${rightRailPad}`}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>共有を読み込み中…</p>
      </div>
    )
  } else if (hashErr) {
    main = (
      <div className={`flex flex-1 flex-col min-h-0 items-center justify-center gap-4 px-4 ${rightRailPad}`}>
        <p className="text-sm text-center" style={{ color: 'var(--text-sub)' }}>{hashErr}</p>
        <Link href="/chat" className="text-sm underline" style={{ color: 'var(--accent)' }}>
          チャットへ戻る
        </Link>
      </div>
    )
  } else {
    main = (
      <ChatContent
        userId={effectiveUserId}
        convId={effectiveConvId}
        initialMessages={initialMessages}
        rightRailPad={rightRailPad}
      />
    )
  }

  return (
    <div className="relative h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {main}
      <AdsenseOverlay />
      <AdsenseRightRail />
    </div>
  )
}
