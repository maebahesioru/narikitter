'use client'

import { useState } from 'react'

type Props = {
  text: string
  /** pill: ラベル付き（バトル等） / icon: ホバーで出す小ボタン（チャット） */
  variant?: 'pill' | 'icon'
  label?: string
  className?: string
  title?: string
  disabled?: boolean
}

export function CopyTextButton({
  text,
  variant = 'pill',
  label = 'コピー',
  className,
  title,
  disabled,
}: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!text || disabled) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* 非同期失敗は握りつぶす（権限・非HTTPS 等） */
    }
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={copy}
        disabled={disabled}
        title={title ?? 'コピー'}
        className={className}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border2)',
          color: copied ? 'var(--accent)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {copied ? '✓' : '⎘'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled || !text}
      title={title}
      className={className}
    >
      {copied ? 'コピーしました' : label}
    </button>
  )
}
