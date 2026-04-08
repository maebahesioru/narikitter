import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | なりきったー',
  description: 'なりきったー（Narikitter）の特定商取引法に基づく表記です。',
}

/** 事業者情報はこの定数を編集してください（所在地・電話番号の項目は設けていません）。 */
const TOKUSHO = {
  sellerName: '十字架_mania',
  representative: '十字架_mania',
  contactEmail: 'maebapiko@gmail.com',
} as const

function orDash(v: string): string {
  const t = v.trim()
  return t ? t : '—'
}

export default function TokushohoPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <h1 className="text-2xl font-bold mb-2">特定商取引法に基づく表記</h1>
      <p className="text-xs mb-8" style={{ color: 'var(--text-faint)' }}>
        サービス名「なりきったー（Narikitter）」に関する表記です。
      </p>

      <dl className="space-y-6 text-sm">
        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            事業者の名称
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            {orDash(TOKUSHO.sellerName)}
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            運営責任者
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            {orDash(TOKUSHO.representative)}
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            メールアドレス（お問い合わせ）
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            {TOKUSHO.contactEmail.trim() ? (
              <a href={`mailto:${TOKUSHO.contactEmail.trim()}`} style={{ color: 'var(--accent)' }}>
                {TOKUSHO.contactEmail.trim()}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            サービス内容
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            X（旧 Twitter）の公開情報を参考にした AI チャット等のオンラインサービス（ウェブアプリ）の提供。
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            販売価格
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            有料プランは、申込手続き時に Stripe の決済画面に表示される金額（税込）とします。無料の利用枠があります。概要は{' '}
            <Link href="/pricing" className="underline" style={{ color: 'var(--accent)' }}>
              料金プラン
            </Link>
            をご確認ください。
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            商品代金以外に必要な費用
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            インターネット接続料金、通信料金等は、利用者のご負担となります。
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            支払方法
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            クレジットカード等、決済代行業者（Stripe）が提供する方法に準じます。
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            支払時期
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            申込・契約にあわせ、各決済画面に表示される条件に従います（サブスクリプションの場合は各課金サイクルに応じた引き落とし）。
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            役務の提供時期
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            決済完了後、通常は数分以内に本サービス上で有料機能が利用可能となるよう反映します。通信状況・決済の確認により遅れる場合があります。
          </dd>
        </section>

        <section>
          <dt className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            解約・キャンセル（返品）
          </dt>
          <dd className="leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            デジタルコンテンツ・役務の性質上、原則として提供開始後の返品・返金には応じられません。サブスクリプションの解約は、Stripe
            の顧客ポータルまたは当サービスが案内する方法に従って行ってください。中途解約の扱いは、決済時に表示される条件に従います。
          </dd>
        </section>
      </dl>

      <p className="text-xs mt-10" style={{ color: 'var(--text-faint)' }}>
        最終更新: 2026年3月
      </p>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/pricing" style={{ color: 'var(--accent)' }}>
          料金プラン
        </Link>
        <Link href="/terms" style={{ color: 'var(--accent)' }}>
          利用規約
        </Link>
        <Link href="/chat" style={{ color: 'var(--accent)' }}>
          チャットに戻る
        </Link>
      </div>
    </div>
  )
}
