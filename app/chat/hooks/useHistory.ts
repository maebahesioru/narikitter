'use client'

import { useEffect, useState, useCallback } from 'react'
import { Message } from '../types'

export interface Conversation {
  id: string
  userId: string
  userName: string
  profileImageUrl: string
  title?: string
  messages: Message[]
  updatedAt: number
}

const DB_NAME = 'narikitter'
const STORE = 'conversations'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveConversation(conv: Conversation) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(conv)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteConversation(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** `battle-` で始まる会話（バトル結果の保存）だけを対象に、古いものから削除して件数を抑える */
export async function pruneBattleHistory(maxKeep = 10): Promise<void> {
  if (maxKeep < 1) return
  const db = await openDB()
  const all: Conversation[] = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const battle = all.filter(c => c.id.startsWith('battle-'))
  if (battle.length <= maxKeep) return
  battle.sort((a, b) => a.updatedAt - b.updatedAt)
  const toDelete = battle.slice(0, battle.length - maxKeep)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const c of toDelete) {
      store.delete(c.id)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function useConversationList() {
  const [list, setList] = useState<Conversation[]>([])

  const refresh = useCallback(async () => {
    const db = await openDB()
    const all: Conversation[] = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    setList(all.sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { list, refresh }
}
