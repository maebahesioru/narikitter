'use client'

import { useEffect } from 'react'

/**
 * 最短の共有入口: `/l#bb=…` → バトル、`/l#cc=…` / `#cs=…` → チャット。
 * 中身は各ページと同じハッシュのままリダイレクト。
 */
export default function ShortShareLandingPage() {
  useEffect(() => {
    const h = window.location.hash
    if (h.startsWith('#bb=')) {
      window.location.replace(`/battle${h}`)
      return
    }
    if (h.startsWith('#cc=') || h.startsWith('#cs=')) {
      window.location.replace(`/chat${h}`)
      return
    }
    window.location.replace('/battle')
  }, [])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-6 text-sm" style={{ color: 'var(--text-muted)' }}>
      <p>共有を開いています…</p>
    </div>
  )
}
