import type { Metadata } from 'next'
import './globals.css'
import { auth } from '@/auth'
import { AuthProvider } from './components/AuthProvider'
import { ThemeProvider } from './components/ThemeProvider'
import { ADSENSE_CLIENT_ID } from '@/lib/adsense'

export const metadata: Metadata = {
  title: 'なりきったー (Narikitter)',
  description: 'X（Twitter）ユーザーの公開ツイートを参考に、そのアカウントになりきって会話できるサービスです。',
  keywords: 'なりきったー, Narikitter, Twitter, X, ツイート, なりきり',
  manifest: '/manifest.json',
  openGraph: {
    title: 'なりきったー (Narikitter)',
    description: 'X（Twitter）ユーザーの公開ツイートを参考に、そのアカウントになりきって会話できます。',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary',
    title: 'なりきったー (Narikitter)',
    description: 'X（Twitter）ユーザーの公開ツイートを参考に、そのアカウントになりきって会話できます。',
  },
  robots: { index: true, follow: true },
  other: { 'mobile-web-app-capable': 'yes', 'apple-mobile-web-app-capable': 'yes', 'apple-mobile-web-app-status-bar-style': 'black-translucent' },
}

const adsenseInDev = process.env.NEXT_PUBLIC_ADSENSE_IN_DEV === '1'
const loadAdsenseScript =
  !!ADSENSE_CLIENT_ID && (process.env.NODE_ENV === 'production' || adsenseInDev)

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#a78bfa" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        {loadAdsenseScript ? <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} /> : null}
        {loadAdsenseScript ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        ) : null}
        {/* theme-init: data-theme のみ（removeChild のモンキーパッチは React 19 と衝突し真っ黒になるため入れない） */}
        <script src="/theme-init.js" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider session={session}>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
              <script src="https://hikakinmaniacoin.hikamer.f5.si/ad.js" data-user-id="cmo8lk1kj0000aggyuhzgv5vk" async></script>
      </body>
    </html>
  )
}
