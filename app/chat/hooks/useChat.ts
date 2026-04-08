'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Message, UserInfo, UserOption } from '../types'
import { fileToBase64, newMessageId, ensureMessageIds } from '../utils'
import { getRandomSuggestions } from '../suggestions'
import { saveConversation, loadConversation } from './useHistory'

export type ChatQuotaInfo = {
  premium: boolean
  used: number
  limit: number
  remaining: number | null
  month: string
}

const RQ_RE = /---\s*RELATED_QUESTIONS\s*---([\s\S]*?)---\s*END_RELATED_QUESTIONS\s*---/

function parseRelatedQuestions(text: string): string[] {
  const match = text.match(RQ_RE)
  if (!match) return []
  return match[1].split(/[?\n？]/).map(q => q.trim()).filter(q => q && !q.startsWith('---') && q.length > 2).map(q => q + (q.endsWith('?') || q.endsWith('？') ? '' : '？')).slice(0, 3)
}

function stripRelatedQuestions(text: string): string {
  return text.replace(RQ_RE, '').trim()
}

export function useChat(
  userId: string,
  convId?: string,
  onSave?: () => void,
  /** 共有リンク等で復元する場合は IndexedDB より優先（未指定なら通常読み込み） */
  initialMessages?: Message[],
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([])
  const [randomSuggestions, setRandomSuggestions] = useState<string[]>([])
  const [tweetCount, setTweetCount] = useState<number | null>(null)
  const [chatQuota, setChatQuota] = useState<ChatQuotaInfo | null>(null)
  const currentConvId = useRef<string>(convId || `${userId}-${Date.now()}`)

  const refreshQuota = useCallback(async () => {
    try {
      const r = await fetch('/api/chat/quota')
      if (!r.ok) return
      const j = (await r.json()) as {
        premium?: boolean
        used?: number
        limit?: number
        remaining?: number | null
        month?: string
      }
      setChatQuota({
        premium: Boolean(j.premium),
        used: typeof j.used === 'number' ? j.used : 0,
        limit: typeof j.limit === 'number' ? j.limit : 30,
        remaining: j.remaining === null || j.remaining === undefined ? null : j.remaining,
        month: typeof j.month === 'string' ? j.month : '',
      })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setChatQuota(null)
      return
    }
    void refreshQuota()
  }, [userId, refreshQuota])

  useEffect(() => {
    if (!userId) return
    setInput('')
    setUploadedFiles([])
    setUploadedPreviews([])
    setRandomSuggestions(getRandomSuggestions(3))

    // 既存会話を読み込む or 新規
    const id = convId || currentConvId.current
    currentConvId.current = id

    if (initialMessages !== undefined) {
      setMessages(ensureMessageIds(initialMessages))
    } else {
      loadConversation(id).then(conv => {
        if (conv) {
          setMessages(ensureMessageIds(conv.messages as Parameters<typeof ensureMessageIds>[0]))
          setUserInfo({ userName: conv.userName, profileImageUrl: conv.profileImageUrl, allProfileImages: [conv.profileImageUrl], description: '' })
        } else {
          setMessages([])
        }
      })
    }

    fetch(`/api/chat?user=${encodeURIComponent(userId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setUserInfo({ userName: data.userName, profileImageUrl: data.profileImageUrl, allProfileImages: data.allProfileImages || [], description: data.description })
      })
      .catch(console.error)
  }, [userId, convId, initialMessages])

  // メッセージ変更時に自動保存
  useEffect(() => {
    if (!userId || !messages.length || !userInfo) return
    const firstUser = messages.find(m => m.role === 'user')
    const title = firstUser ? firstUser.content.slice(0, 40) || undefined : undefined
    saveConversation({
      id: currentConvId.current,
      userId,
      userName: userInfo.userName,
      profileImageUrl: userInfo.profileImageUrl,
      title,
      messages,
      updatedAt: Date.now(),
    }).then(() => onSave?.()).catch(console.error)
  }, [messages, userId, userInfo])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles: File[] = []
    const newPreviews: string[] = []
    for (let i = 0; i < files.length && uploadedFiles.length + newFiles.length < 5; i++) {
      newFiles.push(files[i])
      newPreviews.push(files[i].type.startsWith('image/') || files[i].type.startsWith('video/') ? URL.createObjectURL(files[i]) : '')
    }
    setUploadedFiles(p => [...p, ...newFiles])
    setUploadedPreviews(p => [...p, ...newPreviews])
    e.target.value = ''
  }

  const removeFile = (i: number) => {
    setUploadedFiles(p => p.filter((_, j) => j !== i))
    setUploadedPreviews(p => p.filter((_, j) => j !== i))
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading || !userId) return

    const text = input.trim()
    const priorMessages = messages
    const filesSnapshot = [...uploadedFiles]
    const previewsSnapshot = [...uploadedPreviews]
    setInput('')

    const mediaFiles: { data: string; mimeType: string; preview?: string }[] = []
    const textFiles: { name: string; content: string }[] = []

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      if (file.type.startsWith('text/') || /\.(txt|md|csv|json|ts|tsx|js|jsx|py|html|css|xml|yaml|yml)$/i.test(file.name)) {
        const content = await file.text()
        textFiles.push({ name: file.name, content: content.slice(0, 20000) })
      } else {
        mediaFiles.push({ data: await fileToBase64(file), mimeType: file.type, preview: uploadedPreviews[i] })
      }
    }

    setMessages(p => [...p, { id: newMessageId(), role: 'user', content: text, mediaFiles, textFiles }])
    setUploadedFiles([])
    setUploadedPreviews([])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: text, history: messages, mediaFiles: mediaFiles.map(f => ({ data: f.data, mimeType: f.mimeType })), textFiles }),
      })
      if (!res.ok) {
        let errMsg = 'エラーが発生しました'
        let j: { error?: string } = {}
        try {
          j = (await res.json()) as { error?: string }
        } catch {
          /* ignore */
        }
        if (typeof j.error === 'string' && j.error) errMsg = j.error
        if (res.status === 403) {
          setMessages(priorMessages)
          setInput(text)
          setUploadedFiles(filesSnapshot)
          setUploadedPreviews(previewsSnapshot)
          void refreshQuota()
          return
        }
        throw new Error(errMsg)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let assistantMsg = ''
      let thinkingText = ''
      let sseBuffer = ''

      setMessages(p => [...p, { id: newMessageId(), role: 'assistant', content: '', thinking: '', relatedQuestions: [] }])

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
            if (data.tweetCount !== undefined) { setTweetCount(data.tweetCount); continue }
            if (data.error) {
              assistantMsg = `⚠️ ${data.error}`
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = { ...last, role: 'assistant', content: assistantMsg }
                return n
              })
              continue
            }
            if (data.thought || data.thinking) {
              thinkingText += data.thought || data.thinking
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = { ...last, role: 'assistant', content: stripRelatedQuestions(assistantMsg), thinking: thinkingText }
                return n
              })
            }
            if (data.text) {
              assistantMsg += data.text
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = { ...last, role: 'assistant', content: stripRelatedQuestions(assistantMsg), thinking: thinkingText }
                return n
              })
            }
            if (data.done) {
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = {
                  ...last,
                  role: 'assistant',
                  content: stripRelatedQuestions(assistantMsg),
                  thinking: thinkingText,
                  relatedQuestions: parseRelatedQuestions(assistantMsg),
                }
                return n
              })
            }
          } catch {}
        }
      }
    } catch (error: unknown) {
      const msg = (error as Error).message || 'エラーが発生しました'
      setMessages(p => {
        if (p.length > 0 && p[p.length - 1].role === 'assistant' && !p[p.length - 1].content) {
          const n = [...p]
          const last = n[n.length - 1]
          n[n.length - 1] = { ...last, role: 'assistant', content: `⚠️ ${msg}` }
          return n
        }
        return [...p, { id: newMessageId(), role: 'assistant', content: `⚠️ ${msg}` }]
      })
    } finally {
      void refreshQuota()
      setIsLoading(false)
    }
  }

  const editMessage = async (index: number, newContent: string) => {
    if (!newContent.trim() || isLoading) return
    // そのメッセージ以降を削除して再送信
    const snapshot = messages
    const history = messages.slice(0, index)
    setMessages([...history, { id: newMessageId(), role: 'user', content: newContent }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: newContent, history }),
      })
      if (!res.ok) {
        let errMsg = 'エラーが発生しました'
        try {
          const j = (await res.json()) as { error?: string }
          if (typeof j.error === 'string' && j.error) errMsg = j.error
        } catch {
          /* ignore */
        }
        if (res.status === 403) {
          setMessages(snapshot)
          void refreshQuota()
          return
        }
        throw new Error(errMsg)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('応答を読み取れませんでした')
      const decoder = new TextDecoder()
      let assistantMsg = ''
      let thinkingText = ''
      let sseBuffer = ''
      setMessages(p => [...p, { id: newMessageId(), role: 'assistant', content: '', thinking: '', relatedQuestions: [] }])

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
            if (data.tweetCount !== undefined) {
              setTweetCount(data.tweetCount)
              continue
            }
            if (data.error) {
              assistantMsg = `⚠️ ${data.error}`
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = { ...last, role: 'assistant', content: assistantMsg, thinking: '' }
                return n
              })
              continue
            }
            if (data.thought || data.thinking) {
              thinkingText += data.thought || data.thinking
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = {
                  ...last,
                  role: 'assistant',
                  content: stripRelatedQuestions(assistantMsg),
                  thinking: thinkingText,
                }
                return n
              })
            }
            if (data.text) {
              assistantMsg += data.text
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = {
                  ...last,
                  role: 'assistant',
                  content: stripRelatedQuestions(assistantMsg),
                  thinking: thinkingText,
                }
                return n
              })
            }
            if (data.done) {
              setMessages(p => {
                const n = [...p]
                const last = n[n.length - 1]
                n[n.length - 1] = {
                  ...last,
                  role: 'assistant',
                  content: stripRelatedQuestions(assistantMsg),
                  thinking: thinkingText,
                  relatedQuestions: parseRelatedQuestions(assistantMsg),
                }
                return n
              })
            }
          } catch {
            /* SSE 行パース失敗は無視 */
          }
        }
      }
    } catch (error: unknown) {
      const msg = (error as Error).message || 'エラーが発生しました'
      setMessages(p => {
        if (p.length > 0 && p[p.length - 1].role === 'assistant') {
          const n = [...p]
          n[n.length - 1] = {
            ...n[n.length - 1],
            role: 'assistant',
            content: `⚠️ ${msg}`,
            thinking: '',
            relatedQuestions: [],
          }
          return n
        }
        return [...p, { id: newMessageId(), role: 'assistant', content: `⚠️ ${msg}` }]
      })
    } finally {
      void refreshQuota()
      setIsLoading(false)
    }
  }

  return {
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
    convId: currentConvId.current,
    chatQuota,
    refreshQuota,
  }
}

export function useUserList(userId: string, userSearch: string) {
  const [userList, setUserList] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (userId) return
    if (!userSearch.trim()) { setUserList([]); setLoadingUsers(false); return }
    setLoadingUsers(true)
    const timer = setTimeout(() => {
      fetch(`/api/users?q=${encodeURIComponent(userSearch)}`)
        .then(r => r.ok ? r.json() : { users: [] })
        .then(data => setUserList(data.users || []))
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }, 300)
    return () => { clearTimeout(timer) }
  }, [userId, userSearch])

  return { userList, loadingUsers }
}
