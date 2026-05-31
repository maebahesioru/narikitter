import { redirect } from 'next/navigation'

export const metadata = {
  title: 'ログイン | なりきったー',
}

export default async function LoginPage() {
  redirect('/chat')
}
