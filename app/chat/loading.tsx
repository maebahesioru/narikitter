/** async page の RSC 解決までの間、真っ黒に見えないようにする（バトル等からのクライアント遷移） */
export default function ChatLoading() {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center gap-3"
      style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}
    >
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      <span className="text-sm">読み込み中…</span>
    </div>
  )
}
