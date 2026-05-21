import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LoginButtons } from './LoginButtons'

export const metadata = {
  title: 'ログイン | なりきったー',
}

function safeCallbackUrl(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v || typeof v !== 'string') return '/chat'
  if (!v.startsWith('/') || v.startsWith('//')) return '/chat'
  return v
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>
}) {
  const session = await auth()
  const sp = await searchParams
  const afterLogin = safeCallbackUrl(sp.callbackUrl)

  if (session?.user) {
    redirect(afterLogin)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          ログイン
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          利用には Google でのログインが必要です（パスワードの登録はありません）
        </p>
      </div>
      <LoginButtons callbackUrl={afterLogin} />
    </div>
  )
}
