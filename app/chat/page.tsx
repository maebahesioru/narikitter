import type { Metadata } from 'next'
import ChatPageClient from './ChatPageClient'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://narikitter.vercel.app'

/** クライアント遷移時の RSC キャッシュずれを避ける */
export const dynamic = 'force-dynamic'

async function fetchUserInfo(userId: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/chat?user=${encodeURIComponent(userId)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return res.json() as Promise<{ userName: string; profileImageUrl: string }>
  } catch {
    return null
  }
}

function firstQuery(v: string | string[] | undefined): string {
  if (v === undefined) return ''
  return Array.isArray(v) ? v[0] ?? '' : v
}

function firstQueryOpt(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v[0] : v
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ user?: string | string[] }> }): Promise<Metadata> {
  const sp = await searchParams
  const user = firstQuery(sp.user)
  if (!user) return { title: 'ユーザーを選択 | なりきったー (Narikitter)' }

  const info = await fetchUserInfo(user)
  const name = info?.userName || user
  const ogImageUrl = `${BASE_URL}/api/og?user=${encodeURIComponent(user)}&name=${encodeURIComponent(name)}${info?.profileImageUrl ? `&img=${encodeURIComponent(info.profileImageUrl)}` : ''}`

  return {
    title: `${name}（@${user}）| なりきったー (Narikitter)`,
    description: `${name}（@${user}）の公開ツイートを参考に、なりきって会話できます。`,
    openGraph: {
      title: `${name} | なりきったー`,
      description: `@${user} のツイートを参考に、なりきりで会話`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | なりきったー`,
      description: `@${user} のツイートを参考に、なりきりで会話`,
      images: [ogImageUrl],
    },
  }
}

type PageProps = { searchParams: Promise<{ user?: string | string[]; conv?: string | string[] }> }

/** searchParams はサーバーで解決しクライアントに渡す（useSearchParams + Suspense の onUnsuspend が広告 DOM と衝突しやすいため） */
export default async function ChatPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const userId = firstQuery(sp.user)
  const convId = firstQueryOpt(sp.conv)
  return <ChatPageClient key={`${userId}-${convId ?? ''}`} userId={userId} convId={convId} />
}
