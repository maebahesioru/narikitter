'use client'

import { useState, useEffect, useCallback } from 'react'

export interface TTSVoice {
  name: string
  lang: string
  voiceURI: string
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices()
      const ja = all.filter(v => v.lang.startsWith('ja'))
      const other = all.filter(v => !v.lang.startsWith('ja'))
      setVoices([...ja, ...other].map(v => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI })))
      if (!selectedVoice && ja.length > 0) setSelectedVoice(ja[0].voiceURI)
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [selectedVoice])

  const speak = useCallback((text: string) => {
    if (!text || isSpeaking || !('speechSynthesis' in window)) return
    const plain = text.replace(/[#*_`~\[\]()]/g, '').replace(/\n+/g, '\n').trim()
    const utt = new SpeechSynthesisUtterance(plain)
    if (selectedVoice) {
      const v = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice)
      if (v) { utt.voice = v; utt.lang = v.lang }
    } else {
      utt.lang = 'ja-JP'
    }
    utt.onstart = () => setIsSpeaking(true)
    utt.onend = () => setIsSpeaking(false)
    utt.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utt)
  }, [isSpeaking, selectedVoice])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, speak, stop, voices, selectedVoice, setSelectedVoice }
}
