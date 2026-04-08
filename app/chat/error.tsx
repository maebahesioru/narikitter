'use client'

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6"
      style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}
    >
      <p className="text-sm" style={{ color: 'var(--text)' }}>
        チャット画面の表示に失敗しました
      </p>
      <p className="max-w-md text-center text-xs font-mono opacity-80">{error.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', color: 'var(--text)', cursor: 'pointer' }}
          onClick={() => reset()}
        >
          再試行
        </button>
        <a
          href="/chat"
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}
        >
          再読み込み
        </a>
      </div>
    </div>
  )
}
