'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { ADSENSE_CLIENT_ID } from '@/lib/adsense'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

type Props = {
  /** 広告ユニットの data-ad-slot（AdSense 管理画面で発行） */
  slot: string
  className?: string
  style?: CSSProperties
  /** 可変（レスポンシブ）。固定サイズユニットは width/height を指定 */
  format?: string
  fullWidthResponsive?: boolean
  width?: number
  height?: number
}

/**
 * 表示広告（AdSense）。クライアントで adsbygoogle.push を 1 回だけ。
 */
export function AdSenseUnit({
  slot,
  className = '',
  style,
  format = 'auto',
  fullWidthResponsive = true,
  width,
  height,
}: Props) {
  const pushed = useRef(false)
  const insRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    if (!slot || !ADSENSE_CLIENT_ID || pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* ブロッカー等 */
    }
  }, [slot])

  if (!slot || !ADSENSE_CLIENT_ID) return null

  const fixed = width != null && height != null
  const insStyle: CSSProperties = fixed
    ? { display: 'inline-block', width, height, ...style }
    : { display: 'block', ...style }

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className}`.trim()}
      style={insStyle}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      {...(fixed
        ? {}
        : {
            'data-ad-format': format,
            'data-full-width-responsive': fullWidthResponsive ? 'true' : 'false',
          })}
    />
  )
}
