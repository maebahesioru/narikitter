import type { Metadata } from 'next'

export const metadata: Metadata = { title: '利用規約 | なりきったー (Narikitter)' }

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <h1 className="text-2xl font-bold mb-8">利用規約</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>第1条（サービスの概要）</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          なりきったー（Narikitter）（以下「本サービス」）は、X（旧Twitter）ユーザーの公開ツイートを参考にしたAIとの会話を提供するサービスです。
          AIの回答は実際のユーザーの発言・意見を代表するものではありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>第2条（禁止事項）</h2>
        <ul className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-sub)' }}>
          <li>・ 特定の個人への誹謗中傷・嫌がらせを目的とした利用</li>
          <li>・ 生成されたコンテンツを実際の人物の発言として偽る行為</li>
          <li>・ 違法行為・公序良俗に反する目的での利用</li>
          <li>・ 本サービスへの過度な負荷をかける行為</li>
          <li>・ その他、運営が不適切と判断する行為</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>第3条（免責事項）</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          本サービスのAI回答は自動生成されたものであり、正確性・完全性を保証しません。
          本サービスの利用により生じた損害について、運営は一切の責任を負いません。
          サービスは予告なく変更・停止される場合があります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>第4条（知的財産権）</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          本サービスで参照するツイートの著作権は各投稿者に帰属します。
          AIが生成したコンテンツの権利については、利用者が自由に使用できるものとします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>第5条（規約の変更）</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          本規約は予告なく変更される場合があります。変更後も本サービスを利用した場合、変更後の規約に同意したものとみなします。
        </p>
      </section>

      <p className="text-xs mt-12" style={{ color: 'var(--text-faint)' }}>最終更新: 2026年3月</p>

      <a href="/chat" className="inline-block mt-6 text-sm" style={{ color: 'var(--accent)' }}>← チャットに戻る</a>
    </div>
  )
}
