import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { NextResponse } from 'next/server'

/**
 * Google のみ。環境変数: AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET（本番必須）
 * @see https://authjs.dev/getting-started/providers/google
 */

/** 未ログインでもアクセス可（利用規約・共有ランディングなど） */
function isPublicPath(pathname: string): boolean {
  if (pathname === '/login' || pathname.startsWith('/login/')) return true
  if (pathname === '/privacy' || pathname.startsWith('/privacy/')) return true
  if (pathname === '/terms' || pathname.startsWith('/terms/')) return true
  if (pathname === '/tokushoho' || pathname.startsWith('/tokushoho/')) return true
  if (pathname === '/l' || pathname.startsWith('/l/')) return true
  return false
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname
      /** OAuth / CSRF / session は未ログインでも通す（proxy の matcher に /api/auth を含めるため必須） */
      if (pathname.startsWith('/api/auth')) return true
      if (isPublicPath(pathname)) return true

      if (!auth?.user) {
        const method = request.method
        if (pathname === '/api/stripe/webhook' && method === 'POST') {
          return true
        }
        if (
          method === 'GET' &&
          (pathname === '/api/chat' || pathname === '/api/og')
        ) {
          return true
        }
        if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
          return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
        }
        return false
      }
      return true
    },
  },
})
