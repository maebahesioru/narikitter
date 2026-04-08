import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'プライバシーポリシー | なりきったー (Narikitter)' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <h1 className="text-2xl font-bold mb-8">プライバシーポリシー</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>収集する情報</h2>
        <ul className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-sub)' }}>
          <li>・ <strong style={{ color: 'var(--text)' }}>会話内容：</strong>AIへの送信メッセージはAI応答生成のためにサーバーに送信されます。サーバー側には保存されません。</li>
          <li>・ <strong style={{ color: 'var(--text)' }}>会話履歴：</strong>お使いのブラウザのIndexedDBにのみ保存されます。サーバーには送信されません。</li>
          <li>・ <strong style={{ color: 'var(--text)' }}>添付ファイル：</strong>送信時にAI処理のためサーバーに送信されますが、保存はされません。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>収集しない情報</h2>
        <ul className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-sub)' }}>
          <li>・ 氏名・メールアドレス等の個人情報</li>
          <li>・ アカウント登録情報（本サービスはアカウント不要）</li>
          <li>・ 位置情報</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>第三者サービス</h2>
        <ul className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-sub)' }}>
          <li>・ <strong style={{ color: 'var(--text)' }}>Yahoo リアルタイム検索API：</strong>ユーザー検索・ツイート取得に使用します。</li>
          <li>・ <strong style={{ color: 'var(--text)' }}>AI API：</strong>会話生成に使用します。送信内容は各APIプロバイダーのポリシーに従います。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>データの削除</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          会話履歴はブラウザのIndexedDBに保存されており、サイドバーの × ボタンまたはブラウザのデータ消去から削除できます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>ポリシーの変更</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          本ポリシーは予告なく変更される場合があります。
        </p>
      </section>

      <p className="text-xs mt-12" style={{ color: 'var(--text-faint)' }}>最終更新: 2026年3月</p>

      <a href="/chat" className="inline-block mt-6 text-sm" style={{ color: 'var(--accent)' }}>← チャットに戻る</a>
    </div>
  )
}
