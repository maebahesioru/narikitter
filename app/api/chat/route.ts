import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimit } from '@/lib/rateLimit'
import { fetchUserTweets, YAHOO_HEADERS, type YahooEntry } from '@/lib/yahooRealtime'
import { callOpenAIStream, transformOpenAIStream } from '@/lib/openaiStream'
import { CHAT_FREE_MONTHLY_LIMIT, tryConsumeChatMessage } from '@/lib/chatQuota'

// GET: ユーザー情報取得
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (!rateLimit(ip, 60, 60_000)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const userId = request.nextUrl.searchParams.get('user')
  if (!userId) return NextResponse.json({ error: 'user required' }, { status: 400 })

  try {
    const params = new URLSearchParams({ p: `ID:${userId}`, results: '1' })
    const res = await fetch(`https://search.yahoo.co.jp/realtime/api/v1/pagination?${params}`, { headers: YAHOO_HEADERS })
    if (!res.ok) return NextResponse.json({ error: 'Yahoo API error' }, { status: 502 })
    const data = await res.json()
    const entry: YahooEntry | undefined = data?.timeline?.entry?.[0]

    if (!entry) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({
      userName: entry.name,
      profileImageUrl: entry.profileImage,
      allProfileImages: [entry.profileImage],
      description: '',
    }, { headers: { 'Cache-Control': 'public, max-age=300' } })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST: チャット
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (!rateLimit(ip, 20, 60_000)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'ログインが必要です', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { userId, message, history, mediaFiles, textFiles } = body
    if (!userId || !message) return NextResponse.json({ error: 'userId and message required' }, { status: 400 })
    if (typeof message !== 'string' || message.length > 10000) return NextResponse.json({ error: 'Invalid message' }, { status: 400 })

    const { own: tweets, mentions } = await fetchUserTweets(userId)
    if (!tweets.length) return NextResponse.json({ error: 'User not found or no tweets' }, { status: 404 })

    const quota = await tryConsumeChatMessage(email)
    if (!quota.ok) {
      return NextResponse.json(
        {
          error: `無料プランは月${CHAT_FREE_MONTHLY_LIMIT}通までです。有料プランで無制限にできます。`,
          code: 'CHAT_QUOTA_EXCEEDED',
          limit: quota.limit,
          used: quota.used,
          remaining: quota.remaining,
        },
        { status: 403 },
      )
    }

    const userName = tweets[0].name
    const profileImage = tweets[0].profileImage

    const prompt = buildPrompt(userId, userName, tweets, mentions, history || [], message, textFiles)
    const stream = await callOpenAIStream(prompt, mediaFiles)
    if ('error' in stream) return NextResponse.json({ error: stream.error }, { status: 503 })

    const enc = new TextEncoder()
    const metaChunk = enc.encode(`data: ${JSON.stringify({ tweetCount: tweets.length + mentions.length })}\n\n`)
    const combined = new ReadableStream({
      async start(ctrl) {
        ctrl.enqueue(metaChunk)
        const reader = (stream as ReadableStream<Uint8Array>).getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          ctrl.enqueue(value)
        }
        ctrl.close()
      },
    })

    return new Response(combined, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  } catch (e: unknown) {
    console.error('[Chat POST]', e)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

function buildPrompt(
  userId: string,
  userName: string,
  tweets: YahooEntry[],
  mentions: YahooEntry[],
  history: { role: string; content: string }[],
  message: string,
  textFiles?: { name: string; content: string }[]
): string {
  const tweetTexts = tweets
    .map(t => {
      const d = new Date(t.createdAt * 1000)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      const eng = [t.replyCount > 0 && `返信${t.replyCount}`, t.rtCount > 0 && `RT${t.rtCount}`, t.likesCount > 0 && `いいね${t.likesCount}`].filter(Boolean).join(' ')
      const badge = t.badge?.type && t.badge.type !== 'none' ? ` [${t.badge.type === 'blue' ? '認証済み' : '企業認証'}]` : ''
      const replyTo = t.replyMentions?.length ? ` → @${t.replyMentions[0]}への返信` : ''
      let line = `[${date}${eng ? ' ' + eng : ''}${badge}${replyTo}] ${(t.displayText || '').replace(/\n/g, ' ')}`
      if (t.quotedTweet?.displayTextBody) {
        line += `\n  └ 引用(${t.quotedTweet.name}@${t.quotedTweet.screenName}): ${t.quotedTweet.displayTextBody.replace(/\n/g, ' ')}`
      }
      return line
    })
    .join('\n')

  let prompt = `あなたは「${userName}」(@${userId})になりきってください。

【ツイート${tweets.length}件】
${tweetTexts}
`

  if (mentions.length > 0) {
    const mentionTexts = mentions
      .map(t => {
        const d = new Date(t.createdAt * 1000)
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
        const eng = [t.replyCount > 0 && `返信${t.replyCount}`, t.rtCount > 0 && `RT${t.rtCount}`, t.likesCount > 0 && `いいね${t.likesCount}`].filter(Boolean).join(' ')
        return `[${date}${eng ? ' ' + eng : ''}] ${t.name}(@${t.screenName}): ${(t.displayText || '').replace(/\n/g, ' ')}`
      })
      .join('\n')
    prompt += `\n【${userName}への言及・返信（参考情報・他者の発言）】\n${mentionTexts}\n`
  }

  prompt += `\n【ルール】文体・口調・絵文字を真似/AIと言わない/エンゲージメント数字は出力しない/言及セクションは他者の発言なので本人の言葉として使わない
`

  if (history.length > 0) {
    prompt += '【会話】\n'
    for (const h of history.slice(-10)) {
      prompt += h.role === 'user' ? `相手:${h.content}\n` : `${userName}:${h.content}\n`
    }
  }

  if (textFiles?.length) {
    prompt += '【添付ファイル】\n'
    for (const f of textFiles) {
      prompt += `--- ${f.name} ---\n${f.content}\n\n`
    }
  }

  prompt += `【メッセージ】${message}
【返答】最後に関連質問3つを以下形式で（質問文のみ、ラベル不要）:
---RELATED_QUESTIONS---
最近ハマってることある？
好きな食べ物は？
休日は何してる？
---END_RELATED_QUESTIONS---`

  return prompt
}
