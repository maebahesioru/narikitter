'use client'

type Props = {
  children: React.ReactNode
  session?: unknown
}

export function AuthProvider({ children }: Props) {
  return <>{children}</>
}
