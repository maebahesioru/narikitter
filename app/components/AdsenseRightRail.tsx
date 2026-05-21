'use client'

import { adsenseSlots } from '@/lib/adsense'
import { AdSenseUnit } from './AdSenseUnit'

/** PC（lg 以上）右 160×600 相当。AdSense で縦長ユニットを作成しスロットを設定 */
export function AdsenseRightRail() {
  const slot = adsenseSlots.rightRail

  if (!slot) return null

  return (
    <aside
      className="pointer-events-none fixed inset-y-0 right-0 z-[25] w-[160px] flex-col items-center justify-start overflow-y-auto p-0 hidden lg:flex"
      style={{ background: 'transparent' }}
      aria-hidden
    >
      <div className="pointer-events-auto w-full flex justify-center pt-2">
        <AdSenseUnit slot={slot} width={160} height={600} />
      </div>
    </aside>
  )
}
