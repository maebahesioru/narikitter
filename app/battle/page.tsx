'use client'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from 'react'
import { MarkdownBody } from '../components/MarkdownBody'
import { CopyTextButton } from '../components/CopyTextButton'
import { AdsenseHeader } from '../components/AdsenseHeader'
import { AdsenseOverlay } from '../components/AdsenseOverlay'
import { AdsenseRightRail } from '../components/AdsenseRightRail'
import { AdSenseUnit } from '../components/AdSenseUnit'
import { adsenseSlots, needsMobileOverlayPadding, rightRailPaddingClass } from '@/lib/adsense'
import {
  buildBattleSharePathWithOptionalResultAsync,
  buildBattleShareUrlCompactAsync,
  decodeBattleBundleFromHashAsync,
  decodeBattleResultHashFragmentAsync,
  parseBattleSearchParams,
} from '@/lib/battleShare'
import { tryShortenUrlWithPublicServices } from '@/lib/urlShorten'
import styles from './battle.module.css'
import { ConversationSidebar } from '../chat/components/ConversationSidebar'
import { useConversationList, saveConversation, pruneBattleHistory, loadConversation } from '../chat/hooks/useHistory'
import type { Conversation } from '../chat/hooks/useHistory'
import type { Message } from '../chat/types'
import { newMessageId } from '../chat/utils'

interface UserOption {
  userId: string
  userName: string
  profileImageUrl: string
  allProfileImages: string[]
  tweetCount: number
}

function convToUserOption(c: Conversation): UserOption {
  return {
    userId: c.userId,
    userName: c.userName,
    profileImageUrl: c.profileImageUrl,
    allProfileImages: c.profileImageUrl ? [c.profileImageUrl] : [],
    tweetCount: 0,
  }
}

interface BattleResult {
  text: string
  thinking: string
}

type BattleMode = 'battle' | 'manzai' | 'conte' | 'rap' | 'debate' | 'drama' | 'custom'

function battleModeLabel(m: BattleMode): string {
  const labels: Record<BattleMode, string> = {
    battle: 'バトル',
    manzai: '漫才',
    conte: 'コント',
    rap: 'ラップ',
    debate: 'ディベート',
    drama: 'ドラマ',
    custom: 'カスタム',
  }
  return labels[m]
}

function parseSavedBattleMessages(messages: Message[]): {
  mode: BattleMode
  teamAIds: string[]
  teamBIds: string[]
  note: string
  customBrief: string
  resultText: string
  resultThinking: string
} | null {
  const userMsg = messages.find(m => m.role === 'user')?.content ?? ''
  if (!userMsg.includes('【なりきりAIバトル】')) return null

  const labelToMode: Record<string, BattleMode> = {
    バトル: 'battle',
    漫才: 'manzai',
    コント: 'conte',
    ラップ: 'rap',
    ディベート: 'debate',
    ドラマ: 'drama',
    カスタム: 'custom',
  }
  const firstLine = userMsg.split('\n')[0] ?? ''
  const modeMatch = firstLine.match(/【なりきりAIバトル】(.+)/)
  const modeLabel = modeMatch?.[1]?.trim() ?? ''
  const mode = labelToMode[modeLabel] ?? 'battle'

  let teamAIds: string[] = []
  let teamBIds: string[] = []
  let note = ''
  let customBrief = ''
  for (const line of userMsg.split('\n')) {
    const ma = line.match(/^チームA:\s*(.+)/)
    if (ma) teamAIds = ma[1].split(',').map(s => s.trim().replace(/^@/, '')).filter(Boolean)
    const mb = line.match(/^チームB:\s*(.+)/)
    if (mb) teamBIds = mb[1].split(',').map(s => s.trim().replace(/^@/, '')).filter(Boolean)
    if (line.startsWith('メモ:')) note = line.slice('メモ:'.length).trim()
    if (line.startsWith('カスタム:')) customBrief = line.slice('カスタム:'.length).trim()
  }

  const asst = messages.find(m => m.role === 'assistant')
  const resultText = asst?.content ?? ''
  const resultThinking = asst?.thinking?.trim() ?? ''

  return {
    mode,
    teamAIds,
    teamBIds,
    note,
    customBrief,
    resultText,
    resultThinking,
  }
}

async function saveBattleToHistory(params: {
  teamA: UserOption[]
  teamB: UserOption[]
  mode: BattleMode
  note: string
  customBrief: string
  resultText: string
  resultThinking: string
}): Promise<string | null> {
  const primary = params.teamA[0]
  if (!primary || !params.resultText.trim()) return null

  const lines = [
    `【なりきりAIバトル】${battleModeLabel(params.mode)}`,
    `チームA: ${params.teamA.map(u => `@${u.userId}`).join(', ')}`,
    `チームB: ${params.teamB.map(u => `@${u.userId}`).join(', ')}`,
  ]
  const n = params.note.trim()
  if (n) lines.push(`メモ: ${n}`)
  if (params.mode === 'custom') {
    const c = params.customBrief.trim()
    if (c) lines.push(`カスタム: ${c.length > 2000 ? `${c.slice(0, 2000)}…` : c}`)
  }

  const thinking = params.resultThinking.trim()
  const messages: Message[] = [
    { id: newMessageId(), role: 'user', content: lines.join('\n') },
    {
      id: newMessageId(),
      role: 'assistant',
      content: params.resultText,
      ...(thinking ? { thinking } : {}),
    },
  ]

  const title = `バトル ${battleModeLabel(params.mode)}`.slice(0, 40)

  const id = `battle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await saveConversation({
    id,
    userId: primary.userId,
    userName: primary.userName,
    profileImageUrl: primary.profileImageUrl,
    title,
    messages,
    updatedAt: Date.now(),
  })
  await pruneBattleHistory(10)
  return id
}

async function fetchUserOptionForBattle(id: string): Promise<UserOption | null> {
  try {
    const res = await fetch(`/api/users?q=${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const data = await res.json()
    const users: UserOption[] = data.users || []
    return users.find(u => u.userId.toLowerCase() === id.toLowerCase()) || users[0] || null
  } catch {
    return null
  }
}

function BattleContent() {
  const [mode, setMode] = useState<BattleMode>('battle')
  const [teamA, setTeamA] = useState<UserOption[]>([])
  const [teamB, setTeamB] = useState<UserOption[]>([])
  const [note, setNote] = useState('')
  const [customBrief, setCustomBrief] = useState('')
  const [battleStarted, setBattleStarted] = useState(false)
  const [battleResult, setBattleResult] = useState<BattleResult>({ text: '', thinking: '' })
  const [battleFailed, setBattleFailed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userList, setUserList] = useState<UserOption[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const rightRailPad = rightRailPaddingClass()

  const router = useRouter()
  const searchParams = useSearchParams()
  const [shareHint, setShareHint] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const convFromUrl = searchParams.get('conv') ?? ''

  const { list: recentConvs, refresh: refreshConversationList } = useConversationList()
  const recentFromChat = useMemo(() => {
    const seen = new Set<string>()
    return recentConvs
      .filter(c => {
        if (seen.has(c.userId)) return false
        seen.add(c.userId)
        return true
      })
      .slice(0, 6)
      .map(convToUserOption)
  }, [recentConvs])

  /** URL 復元: `#bb=` バンドル → `?a=&b=` + 任意 `#bt=` */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      if (hash.startsWith('#bb=')) {
        const bundle = await decodeBattleBundleFromHashAsync(hash)
        if (cancelled || !bundle) return
        const [ta, tb] = await Promise.all([
          Promise.all(bundle.A.map(fetchUserOptionForBattle)),
          Promise.all(bundle.B.map(fetchUserOptionForBattle)),
        ])
        if (cancelled) return
        const teamAOk = ta.filter((u): u is UserOption => !!u)
        const teamBOk = tb.filter((u): u is UserOption => !!u)
        if (!teamAOk.length || !teamBOk.length) return
        setTeamA(teamAOk)
        setTeamB(teamBOk)
        setMode(bundle.m as BattleMode)
        setNote(bundle.n)
        setCustomBrief(bundle.c)
        if (bundle.t != null || bundle.k != null) {
          setBattleStarted(true)
          setBattleResult({ text: bundle.t ?? '', thinking: bundle.k ?? '' })
          setBattleFailed(false)
        }
        window.history.replaceState({}, '', window.location.pathname)
        return
      }

      const convId = searchParams.get('conv')
      if (convId?.startsWith('battle-')) {
        const c = await loadConversation(convId)
        if (cancelled || !c) return
        const parsed = parseSavedBattleMessages(c.messages)
        if (!parsed) return
        const [ta, tb] = await Promise.all([
          Promise.all(parsed.teamAIds.map(fetchUserOptionForBattle)),
          Promise.all(parsed.teamBIds.map(fetchUserOptionForBattle)),
        ])
        if (cancelled) return
        const teamAOk = ta.filter((u): u is UserOption => !!u)
        const teamBOk = tb.filter((u): u is UserOption => !!u)
        if (!teamAOk.length || !teamBOk.length) return
        setTeamA(teamAOk)
        setTeamB(teamBOk)
        setMode(parsed.mode)
        setNote(parsed.note)
        setCustomBrief(parsed.customBrief)
        setBattleStarted(true)
        setBattleResult({ text: parsed.resultText, thinking: parsed.resultThinking })
        setBattleFailed(false)
        return
      }

      const spKey = searchParams.toString()
      if (!spKey) return

      const parsed = parseBattleSearchParams(`?${spKey}`)
      if (!parsed) return

      const [ta, tb] = await Promise.all([
        Promise.all(parsed.teamAIds.map(fetchUserOptionForBattle)),
        Promise.all(parsed.teamBIds.map(fetchUserOptionForBattle)),
      ])
      if (cancelled) return
      const teamAOk = ta.filter((u): u is UserOption => !!u)
      const teamBOk = tb.filter((u): u is UserOption => !!u)
      if (teamAOk.length && teamBOk.length) {
        setTeamA(teamAOk)
        setTeamB(teamBOk)
        setMode(parsed.mode as BattleMode)
        setNote(parsed.note)
        setCustomBrief(parsed.customBrief)

        const fromHash = await decodeBattleResultHashFragmentAsync(window.location.hash)
        if (fromHash && (fromHash.resultText || fromHash.resultThinking)) {
          setBattleStarted(true)
          setBattleResult({
            text: fromHash.resultText,
            thinking: fromHash.resultThinking,
          })
          setBattleFailed(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams.toString()])

  const shareBattleSetup = useCallback(async () => {
    if (teamA.length === 0 || teamB.length === 0) return

    const baseState = {
      teamAIds: teamA.map(u => u.userId),
      teamBIds: teamB.map(u => u.userId),
      mode,
      note,
      customBrief,
    }

    const origin = window.location.origin
    const resultForUrl =
      battleStarted && (battleResult.text || battleResult.thinking)
        ? { resultText: battleResult.text, resultThinking: battleResult.thinking }
        : undefined

    const compact = await buildBattleShareUrlCompactAsync(baseState, resultForUrl)
    const fallback = `${origin}${await buildBattleSharePathWithOptionalResultAsync(baseState, resultForUrl)}`
    let url = compact ? `${origin}${compact}` : fallback
    const shortUrl = await tryShortenUrlWithPublicServices(url)
    if (shortUrl) url = shortUrl

    const resultDroppedFromUrl =
      Boolean(resultForUrl) && !url.includes('#bb=') && !url.includes('#bt=')

    const setHintAfter = (ok: string) => {
      if (resultDroppedFromUrl) {
        setShareHint(`${ok}（本文が長すぎて URL に含められませんでした）`)
        return
      }
      setShareHint(ok)
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'なりきりAIバトル', url })
        setHintAfter('共有しました')
      } else {
        await navigator.clipboard.writeText(url)
        setHintAfter('URLをコピーしました')
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        setHintAfter('URLをコピーしました')
      } catch {
        setShareHint('コピーに失敗しました')
      }
    }
    window.setTimeout(() => setShareHint(null), 3200)
  }, [teamA, teamB, mode, note, customBrief, battleStarted, battleResult.text, battleResult.thinking])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [battleResult.text, battleResult.thinking, isLoading])

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(userSearch)}`)
        if (res.ok) {
          const data = await res.json()
          setUserList(data.users || [])
        }
      } catch (e) {
        console.error('Failed to fetch users:', e)
      }
      setLoadingUsers(false)
    }

    const timer = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const allImages = JSON.parse(img.dataset.images || '[]')
    let idx = parseInt(img.dataset.index || '0') + 1
    while (idx < allImages.length) {
      const nextUrl = allImages[idx]
      if (nextUrl && nextUrl !== img.src) {
        img.dataset.index = idx.toString()
        img.src = nextUrl
        return
      }
      idx++
    }
    img.src = '/default-avatar.svg'
  }

  const addToTeam = (user: UserOption, team: 'A' | 'B') => {
    if (team === 'A' && teamA.length < 5 && !teamA.find(u => u.userId === user.userId)) {
      setTeamA([...teamA, user])
    } else if (team === 'B' && teamB.length < 5 && !teamB.find(u => u.userId === user.userId)) {
      setTeamB([...teamB, user])
    }
  }

  const canAddToTeam = (user: UserOption, team: 'A' | 'B') => {
    if (team === 'A') return teamA.length < 5 && !teamA.find(u => u.userId === user.userId)
    return teamB.length < 5 && !teamB.find(u => u.userId === user.userId)
  }

  const removeFromTeam = (userId: string, team: 'A' | 'B') => {
    if (team === 'A') setTeamA(teamA.filter(u => u.userId !== userId))
    else setTeamB(teamB.filter(u => u.userId !== userId))
  }

  const startBattle = async () => {
    if (teamA.length === 0 || teamB.length === 0) return
    if (mode === 'custom' && !customBrief.trim()) return

    setBattleStarted(true)
    setIsLoading(true)
    setBattleFailed(false)
    setBattleResult({ text: '', thinking: '' })

    try {
      const res = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamA: teamA.map(u => u.userId),
          teamB: teamB.map(u => u.userId),
          note: note.trim(),
          mode,
          ...(mode === 'custom' ? { customBrief: customBrief.trim() } : {}),
        }),
      })

      if (!res.ok) {
        let errMsg = 'エラーが発生しました'
        try {
          const j = (await res.json()) as { error?: string }
          if (typeof j.error === 'string' && j.error) errMsg = j.error
        } catch {
          /* ignore */
        }
        throw new Error(errMsg)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('応答を読み取れませんでした')

      const decoder = new TextDecoder()
      let sseBuffer = ''
      let text = ''
      let thinking = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const events = sseBuffer.split('\n\n')
        sseBuffer = events.pop() || ''

        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.thinking || data.thought) {
              thinking += data.thinking || data.thought
              setBattleResult({ text, thinking })
            }
            if (data.text) {
              text += data.text
              setBattleResult({ text, thinking })
            }
          } catch (e) {
            console.error('Parse error:', e)
          }
        }
      }

      if (text.trim()) {
        void (async () => {
          try {
            const newId = await saveBattleToHistory({
              teamA,
              teamB,
              mode,
              note,
              customBrief,
              resultText: text,
              resultThinking: thinking,
            })
            await refreshConversationList()
            if (newId) {
              router.replace(`/battle?conv=${encodeURIComponent(newId)}`)
            }
          } catch (e) {
            console.error('[battle] save history', e)
          }
        })()
      }
    } catch (error) {
      console.error('Battle error:', error)
      const msg =
        error instanceof Error ? error.message : 'エラーが発生しました'
      setBattleResult({ text: msg, thinking: '' })
      setBattleFailed(true)
    } finally {
      setIsLoading(false)
    }
  }

  const resetBattle = () => {
    setBattleStarted(false)
    setBattleFailed(false)
    setBattleResult({ text: '', thinking: '' })
    router.replace('/battle')
  }

  if (battleStarted) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden w-full" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          <ConversationSidebar
            currentConvId={convFromUrl}
            currentUserId=""
            list={recentConvs}
            onRefresh={refreshConversationList}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            sidebarAdSlot={adsenseSlots.sidebar || undefined}
          />
          <div
            className={`relative flex flex-1 flex-col min-h-0 min-w-0 overflow-x-hidden overflow-y-auto ${rightRailPad} ${needsMobileOverlayPadding() ? 'pb-[50px] md:pb-0' : ''}`}
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
          >
        <header className={styles.header}>
          <button
            type="button"
            onClick={() => setSidebarOpen(o => !o)}
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-sub)', cursor: 'pointer' }}
            aria-label="履歴メニュー"
          >
            ☰
          </button>
          <button type="button" onClick={resetBattle} className={styles.backBtn}>
            ← 戻る
          </button>
          <span className={styles.headerTitle}>⚔️ バトル</span>
          <div className={styles.headerLinks}>
            <button
              type="button"
              className={styles.headerShareBtn}
              disabled={teamA.length === 0 || teamB.length === 0}
              title="共有リンクをコピーします（短縮 API 利用時は短い URL）"
              onClick={() => void shareBattleSetup()}
            >
              🔗 共有
            </button>
            {shareHint ? (
              <span className={styles.headerShareHint} aria-live="polite">
                {shareHint}
              </span>
            ) : null}
            <Link href="/chat" className={styles.headerLink} prefetch={false}>
              💬 チャット
            </Link>
          </div>
        </header>

        {adsenseSlots.aboveToolbar ? (
          <div className="flex w-full justify-center">
            <AdSenseUnit slot={adsenseSlots.aboveToolbar} format="horizontal" fullWidthResponsive style={{ minHeight: 90 }} />
          </div>
        ) : null}
        <AdsenseHeader />
        {adsenseSlots.banner320 ? (
          <div className="flex justify-center py-2">
            <AdSenseUnit slot={adsenseSlots.banner320} width={320} height={100} />
          </div>
        ) : null}

        <div className={styles.battleArea}>
          <div className={styles.teamsHeader}>
            <div className={styles.teamHeader}>
              {teamA.map(u => (
                <img
                  key={u.userId}
                  src={u.profileImageUrl || '/default-avatar.svg'}
                  alt={u.userName}
                  className={styles.teamAvatar}
                  onError={handleImageError}
                />
              ))}
            </div>
            <span className={styles.vs}>VS</span>
            <div className={styles.teamHeader}>
              {teamB.map(u => (
                <img
                  key={u.userId}
                  src={u.profileImageUrl || '/default-avatar.svg'}
                  alt={u.userName}
                  className={styles.teamAvatar}
                  onError={handleImageError}
                />
              ))}
            </div>
          </div>

          <div className={styles.messagesArea}>
            {battleResult.thinking ? (
              <details className={styles.thinkingDetails} open={isLoading}>
                <summary>🤔 推論過程</summary>
                <div className={styles.thinkingContent}>
                  <MarkdownBody>{battleResult.thinking}</MarkdownBody>
                </div>
              </details>
            ) : null}

            <div className={styles.battleText}>
              {battleResult.text ? (
                <MarkdownBody>{battleResult.text}</MarkdownBody>
              ) : isLoading ? (
                <div className={styles.loading}>バトル生成中...</div>
              ) : null}
            </div>

            {battleResult.text && !isLoading ? (
              <div className={styles.copyBtnRow}>
                <CopyTextButton
                  variant="pill"
                  text={battleResult.text}
                  label="本文をコピー"
                  className={styles.copyBtn}
                />
                {battleResult.thinking ? (
                  <CopyTextButton
                    variant="pill"
                    text={battleResult.thinking}
                    label="推論をコピー"
                    className={styles.copyBtn}
                  />
                ) : null}
              </div>
            ) : null}

            {battleFailed && !isLoading ? (
              <div className={styles.battleRetryWrap}>
                <button type="button" className={styles.retryBtn} onClick={() => void startBattle()}>
                  再試行
                </button>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {adsenseSlots.mrec ? (
          <div className="flex justify-center py-4">
            <AdSenseUnit slot={adsenseSlots.mrec} width={300} height={250} />
          </div>
        ) : null}

        <AdsenseOverlay />
        <AdsenseRightRail />
          </div>
        </div>
      </div>
    )
  }

  const modeLabels = {
    battle: '⚔️ バトル',
    manzai: '🎤 漫才',
    conte: '🎭 コント',
    rap: '🎵 ラップバトル',
    debate: '💬 ディベート',
    drama: '🎬 ドラマ',
    custom: '✨ カスタム',
  }

  const modeDescriptions = {
    battle: '物理的な戦闘シーン！必殺技や覚醒で熱いバトル',
    manzai: 'ボケとツッコミの掛け合い漫才',
    conte: 'シチュエーションコメディ',
    rap: '韻を踏んだラップバトル',
    debate: '論理的な議論対決',
    drama: '感動のドラマストーリー',
    custom: '形式・ジャンル・展開を自分で指定。下の「創作の内容」に詳しく書いてください',
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden w-full" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        <ConversationSidebar
          currentConvId={convFromUrl}
          currentUserId=""
          list={recentConvs}
          onRefresh={refreshConversationList}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sidebarAdSlot={adsenseSlots.sidebar || undefined}
        />
        <div
          className={`relative flex flex-1 flex-col min-h-0 min-w-0 overflow-x-hidden overflow-y-auto ${rightRailPad} ${needsMobileOverlayPadding() ? 'pb-[50px] md:pb-0' : ''}`}
          style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
      <header className={styles.header}>
        <button
          type="button"
          onClick={() => setSidebarOpen(o => !o)}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text-sub)', cursor: 'pointer' }}
          aria-label="履歴メニュー"
        >
          ☰
        </button>
        <span className={styles.headerTitle}>⚔️ なりきりAIバトル</span>
        <div className={styles.headerLinks}>
          <button
            type="button"
            className={styles.headerShareBtn}
            disabled={teamA.length === 0 || teamB.length === 0}
            title="共有リンクをコピーします（短縮 API 利用時は短い URL）"
            onClick={() => void shareBattleSetup()}
          >
            🔗 共有
          </button>
          {shareHint ? (
            <span className={styles.headerShareHint} aria-live="polite">
              {shareHint}
            </span>
          ) : null}
          <Link href="/chat" className={styles.headerLink} prefetch={false}>
            💬 チャット
          </Link>
        </div>
      </header>

      {adsenseSlots.aboveToolbar ? (
        <div className="flex w-full justify-center">
          <AdSenseUnit slot={adsenseSlots.aboveToolbar} format="horizontal" fullWidthResponsive style={{ minHeight: 90 }} />
        </div>
      ) : null}
      <AdsenseHeader />

      <div className={styles.setupArea}>
        <h2>なりきりAI創作</h2>
        <p className={styles.setupDesc}>最大5vs5でAIがなりきり創作！</p>

        <div className={styles.modeSelector}>
          {(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map(m => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
              onClick={() => setMode(m)}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
        <p className={styles.modeDesc}>{modeDescriptions[mode]}</p>

        {mode === 'custom' ? (
          <div className={styles.customBriefArea}>
            <label htmlFor="battle-custom-brief">創作の内容（必須）</label>
            <textarea
              id="battle-custom-brief"
              value={customBrief}
              onChange={e => setCustomBrief(e.target.value)}
              placeholder="例: 料理対決リアリティショー。審査は鉄人のみ。ギャグ多めで。 / 朗読劇風で、ナレーションあり。など"
              className={styles.customBriefTextarea}
              rows={5}
            />
          </div>
        ) : null}

        {adsenseSlots.banner320 ? (
          <div className="flex justify-center py-3">
            <AdSenseUnit slot={adsenseSlots.banner320} width={320} height={100} />
          </div>
        ) : null}

        <div id="battle-user-search" className="w-full max-w-md mx-auto mb-8">
          <p className="text-xs mb-2 text-center" style={{ color: 'var(--text-faint)' }}>
            ユーザーを検索して、チームA / チームBに追加
          </p>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">🔍</span>
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="ユーザーIDを入力 (例: nhk_news)"
              className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm outline-none transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text)' }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--accent)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border2)'
              }}
            />
          </div>

          {!userSearch && recentFromChat.length > 0 ? (
            <div className="mb-6">
              <p className="text-xs mb-3 text-left" style={{ color: 'var(--text-faint)' }}>
                最近話したユーザー
              </p>
              <div className="flex flex-col gap-2">
                {recentFromChat.map(user => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)' }}
                  >
                    <img
                      src={user.profileImageUrl || '/default-avatar.svg'}
                      alt={user.userName}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                      data-images={JSON.stringify(user.allProfileImages || [])}
                      data-index="0"
                      onError={handleImageError}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{user.userName}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        @{user.userId}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => addToTeam(user, 'A')}
                        disabled={!canAddToTeam(user, 'A')}
                        className="min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                        style={{
                          background: 'color-mix(in srgb, var(--accent) 18%, var(--bg-card))',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent)',
                          cursor: canAddToTeam(user, 'A') ? 'pointer' : 'not-allowed',
                        }}
                        title="チームAに追加"
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => addToTeam(user, 'B')}
                        disabled={!canAddToTeam(user, 'B')}
                        className="min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                        style={{
                          background: 'var(--bg-card2)',
                          border: '1px solid var(--border2)',
                          color: 'var(--text-sub)',
                          cursor: canAddToTeam(user, 'B') ? 'pointer' : 'not-allowed',
                        }}
                        title="チームBに追加"
                      >
                        B
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {loadingUsers ? (
            <div className="flex justify-center py-6">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : null}

          {!loadingUsers && userSearch && userList.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--text-faint)' }}>
              ユーザーが見つかりませんでした
            </p>
          ) : null}

          {userList.length > 0 ? (
            <div className="flex flex-col gap-2">
              {userList.map(user => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)' }}
                >
                  <img
                    src={user.profileImageUrl || '/default-avatar.svg'}
                    alt={user.userName}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                    data-images={JSON.stringify(user.allProfileImages || [])}
                    data-index="0"
                    onError={handleImageError}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{user.userName}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      @{user.userId}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => addToTeam(user, 'A')}
                      disabled={!canAddToTeam(user, 'A')}
                      className="min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                      style={{
                        background: 'color-mix(in srgb, var(--accent) 18%, var(--bg-card))',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent)',
                        cursor: canAddToTeam(user, 'A') ? 'pointer' : 'not-allowed',
                      }}
                      title="チームAに追加"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => addToTeam(user, 'B')}
                      disabled={!canAddToTeam(user, 'B')}
                      className="min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                      style={{
                        background: 'var(--bg-card2)',
                        border: '1px solid var(--border2)',
                        color: 'var(--text-sub)',
                        cursor: canAddToTeam(user, 'B') ? 'pointer' : 'not-allowed',
                      }}
                      title="チームBに追加"
                    >
                      B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.teamsSetup}>
          <div className={styles.teamSetup}>
            <h3>チームA ({teamA.length}/5)</h3>
            <div className={styles.teamMembers}>
              {teamA.map(user => (
                <div key={user.userId} className={styles.teamMember}>
                  <img
                    src={user.profileImageUrl || '/default-avatar.svg'}
                    alt={user.userName}
                    className={styles.memberAvatar}
                    onError={handleImageError}
                  />
                  <span>{user.userName}</span>
                  <button type="button" onClick={() => removeFromTeam(user.userId, 'A')} className={styles.removeBtn}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.vsCenter}>VS</div>

          <div className={styles.teamSetup}>
            <h3>チームB ({teamB.length}/5)</h3>
            <div className={styles.teamMembers}>
              {teamB.map(user => (
                <div key={user.userId} className={styles.teamMember}>
                  <img
                    src={user.profileImageUrl || '/default-avatar.svg'}
                    alt={user.userName}
                    className={styles.memberAvatar}
                    onError={handleImageError}
                  />
                  <span>{user.userName}</span>
                  <button type="button" onClick={() => removeFromTeam(user.userId, 'B')} className={styles.removeBtn}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {adsenseSlots.mrec ? (
          <div className="flex justify-center py-4">
            <AdSenseUnit slot={adsenseSlots.mrec} width={300} height={250} />
          </div>
        ) : null}

        <div className={styles.topicArea}>
          <label htmlFor="battle-note">
            {mode === 'custom' ? '追加の指示（任意・創作の内容を補足）' : '追加の指示（任意）'}
          </label>
          <input
            id="battle-note"
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={
              mode === 'custom'
                ? '例: 尺は短め、ツッコミ強め、など'
                : '例: 舞台は渋谷、ギャグ多め、シリアス展開で'
            }
            className={styles.topicInput}
          />
        </div>

        <button
          type="button"
          onClick={startBattle}
          disabled={
            teamA.length === 0 ||
            teamB.length === 0 ||
            (mode === 'custom' && !customBrief.trim())
          }
          className={styles.startBtn}
        >
          {modeLabels[mode]} 開始
        </button>
      </div>

      <AdsenseOverlay />
      <AdsenseRightRail />
        </div>
      </div>
    </div>
  )
}

/** useSearchParams 待ちの間も広告枠をマウント（真っ白＋広告ゼロを防ぐ） */
function BattleSuspenseFallback() {
  const rightRailPad = rightRailPaddingClass()
  return (
    <div
      className={`relative ${styles.container} ${rightRailPad} ${needsMobileOverlayPadding() ? 'pb-[50px] md:pb-0' : ''}`}
    >
      {adsenseSlots.aboveToolbar ? (
        <div className="flex w-full justify-center">
          <AdSenseUnit slot={adsenseSlots.aboveToolbar} format="horizontal" fullWidthResponsive style={{ minHeight: 90 }} />
        </div>
      ) : null}
      <AdsenseHeader />
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
        読み込み中…
      </div>
      <AdsenseOverlay />
      <AdsenseRightRail />
    </div>
  )
}

export default function BattlePage() {
  return (
    <Suspense fallback={<BattleSuspenseFallback />}>
      <BattleContent />
    </Suspense>
  )
}
