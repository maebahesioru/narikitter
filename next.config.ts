import path from 'node:path'
import { fileURLToPath } from 'node:url'
import withPWA from '@ducanh2912/next-pwa'
import type { NextConfig } from 'next'

const appDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  /** 広告・PWA 等の第三者 DOM と React 19 Strict の二重マウントで removeChild 不整合が出る場合がある */
  reactStrictMode: false,
  // htmlLimitedBots を全 UA に当てる設定は、クライアント遷移で /chat が真っ黒のまま止まる事例があったため未設定。removeChild は theme-init.js 側。
  /** 親ディレクトリに別の pnpm-lock がある環境で誤ったルートを選ばない（Vercel 含む） */
  turbopack: { root: appDir },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'rts-pctr.c.yimg.jp' },
    ],
  },
}

export default withPWA({
  dest: 'public',
  /** App Router の RSC と相性が悪く、クライアント遷移後に真っ黒のまま止まることがあるためオフ */
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
