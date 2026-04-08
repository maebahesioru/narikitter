import Link from 'next/link'
import { SubscribeButton } from './SubscribeButton'

export const metadata = {
  title: '料金プラン | なりきったー',
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[] }>
}) {
  const sp = await searchParams
  const checkout = typeof sp.checkout === 'string' ? sp.checkout : Array.isArray(sp.checkout) ? sp.checkout[0] : undefined

  return (
    <div className="min-h-screen px-4 py-10 max-w-lg mx-auto" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <h1 className="text-xl font-bold mb-6">料金プラン</h1>

      {checkout === 'success' ? (
        <p className="mb-4 text-sm p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', color: 'var(--text-muted)' }}>
          お支払いありがとうございます。反映まで数秒〜1分ほどかかることがあります。チャット画面を開き直すと無制限になります。
        </p>
      ) : null}
      {checkout === 'canceled' ? (
        <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          決済をキャンセルしました。
        </p>
      ) : null}

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        <section className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)' }}>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>
            無料
          </h2>
          <p>
            Google でログインしたうえで、チャットの送信は<strong style={{ color: 'var(--text)' }}>月あたり 30 通まで</strong>
            （日本時間の月初でリセット）。編集からの再送も 1 通として数えます。
          </p>
        </section>

        <section className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)' }}>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>
            有料（無制限）
          </h2>
          <p className="mb-4">
            <strong style={{ color: 'var(--text)' }}>Stripe</strong> のサブスクリプションで、チャット送信が無制限になります（
            <strong style={{ color: 'var(--text)' }}>ログイン中の Google メール</strong>と Stripe の顧客メールが一致している必要があります）。
          </p>
          <SubscribeButton />
          <p className="text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
            運営向け: 手動で無料開放する場合は <code className="text-[11px]">PREMIUM_USER_EMAILS</code> も利用できます。
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-col gap-3 text-sm">
        <Link href="/tokushoho" className="underline" style={{ color: 'var(--text-muted)' }} prefetch={false}>
          特定商取引法に基づく表記
        </Link>
        <Link href="/chat" className="underline" style={{ color: 'var(--accent)' }} prefetch={false}>
          ← チャットに戻る
        </Link>
      </div>
    </div>
  )
}
