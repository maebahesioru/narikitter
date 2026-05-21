'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { adsenseSlots } from '@/lib/adsense'
import { AdSenseUnit } from './AdSenseUnit'

function subscribeMobileMq(cb: () => void) {
  const mq = window.matchMedia('(max-width: 767px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 767px)').matches
}

function useIsMobileHeader(): boolean {
  return useSyncExternalStore(subscribeMobileMq, isMobileViewport, () => false)
}

/** メインカラム・ツールバー直下（スマホ / PC で別スロット可。片方だけ設定なら両方でそのスロット） */
export function AdsenseHeader() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const isMobile = useIsMobileHeader()
  const mobile = adsenseSlots.headerMobile || adsenseSlots.headerDesktop
  const desktop = adsenseSlots.headerDesktop || adsenseSlots.headerMobile
  const slot = isMobile ? mobile : desktop

  return (
    <div className="min-h-[90px] w-full flex-shrink-0" style={{ background: 'var(--bg)' }} aria-hidden>
      {mounted && slot ? (
        <div className="flex w-full justify-center">
          <AdSenseUnit
            slot={slot}
            format="auto"
            fullWidthResponsive
            style={{ minHeight: isMobile ? 50 : 90 }}
          />
        </div>
      ) : null}
    </div>
  )
}
