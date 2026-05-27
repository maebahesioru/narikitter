import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

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
    authorized() {
      // 全ページ・全APIを認証なしで公開
      return true
    },
  },
})
