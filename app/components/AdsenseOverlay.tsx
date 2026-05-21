'use client'

import { useEffect, useState } from 'react'
import { adsenseSlots } from '@/lib/adsense'
import { AdSenseUnit } from './AdSenseUnit'

/** スマホのみ・画面下部（320×50 等のユニット向け） */
export function AdsenseOverlay() {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const slot = adsenseSlots.overlayMobile
  const show = mounted && isMobile && !!slot

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex justify-center"
      style={{
        background: 'var(--bg)',
        minHeight: show ? 50 : 0,
        pointerEvents: show ? 'auto' : 'none',
      }}
      aria-hidden
    >
      {show ? (
        <div className="flex w-full max-w-[320px] justify-center py-1">
          <AdSenseUnit slot={slot} width={320} height={50} />
        </div>
      ) : null}
    </div>
  )
}
