/** 空文字の env は未設定扱い */
function trim(s: string | undefined): string {
  return (s ?? '').trim()
}

/** すべての AdSense 枠を止める（開発・本番共通） */
export function adsenseGloballyDisabled(): boolean {
  return process.env.NEXT_PUBLIC_ADSENSE_DISABLED === '1'
}

/** layout / script 読み込み用（既定は既存サイトの発行者 ID） */
export const ADSENSE_CLIENT_ID = adsenseGloballyDisabled()
  ? ''
  : trim(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) || 'ca-pub-9868361167191737'

/**
 * 枠ごとに AdSense 管理画面でユニットを作成し、スロット ID を .env に設定。
 * 未設定の枠はレンダーしない。
 */
export const adsenseSlots = {
  aboveToolbar: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ABOVE_TOOLBAR),
  /** メインカラム・ツールバー直下（PC 想定・728×90 など） */
  headerDesktop: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER_PC),
  /** 同上・スマホ帯（320×50 など） */
  headerMobile: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER_MOBILE),
  banner320: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER_320),
  mrec: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_MREC),
  sidebar: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR),
  overlayMobile: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_OVERLAY_MOBILE),
  /** PC 右縦（160×600 等。ユニットサイズに合わせて作成） */
  rightRail: adsenseGloballyDisabled() ? '' : trim(process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT_RAIL),
} as const

/** スマホ下部オーバーレイ用の下パディングが必要か */
export function needsMobileOverlayPadding(): boolean {
  return !!adsenseSlots.overlayMobile
}

/** 右レール用の lg 右パディング class（スロットがあるときのみ） */
export function rightRailPaddingClass(): string {
  return adsenseSlots.rightRail ? 'lg:pr-[160px]' : ''
}
