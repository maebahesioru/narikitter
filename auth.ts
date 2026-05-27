import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 全認証撤廃済み — 認証ゲートなし
export function auth() {
  return null
}

export const handlers = {
  GET: () => NextResponse.json({ message: 'auth disabled' }),
  POST: () => NextResponse.json({ message: 'auth disabled' }),
}

export const signIn = () => {}
export const signOut = () => {}
