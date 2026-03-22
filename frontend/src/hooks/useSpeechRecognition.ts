import { useCallback, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export interface UseSpeechRecognitionReturn {
  isListening: boolean
  transcript: string
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  isSupported: boolean
}

// ----- 브라우저 Web Speech API 타입 -----

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: Event & { error: string }) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

// ----- Capacitor 네이티브 STT -----

async function getCapacitorSpeechRecognition() {
  const { SpeechRecognition } = await import(
    '@capacitor-community/speech-recognition'
  )
  return SpeechRecognition
}

// ----- 훅 -----

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const webRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const isNative = Capacitor.isNativePlatform()

  const isSupported =
    isNative ||
    typeof window.SpeechRecognition !== 'undefined' ||
    typeof window.webkitSpeechRecognition !== 'undefined'

  // ----- 네이티브 (Capacitor) -----

  const startNative = useCallback(async () => {
    const SpeechRecognition = await getCapacitorSpeechRecognition()

    const permResult = await SpeechRecognition.requestPermissions()
    if (permResult.speechRecognition !== 'granted') {
      return
    }

    setIsListening(true)
    setTranscript('')

    await SpeechRecognition.start({
      language: 'ko-KR',
      partialResults: true,
      popup: false,
    })

    SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
      if (data.matches.length > 0) {
        setTranscript(data.matches[0])
      }
    })
  }, [])

  const stopNative = useCallback(async () => {
    const SpeechRecognition = await getCapacitorSpeechRecognition()
    await SpeechRecognition.stop()
    SpeechRecognition.removeAllListeners()
    setIsListening(false)
  }, [])

  // ----- 브라우저 (Web Speech API) -----

  const startWeb = useCallback(async () => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript
      }
      setTranscript(finalTranscript)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    webRecognitionRef.current = recognition
    setIsListening(true)
    setTranscript('')
    recognition.start()
  }, [])

  const stopWeb = useCallback(async () => {
    if (webRecognitionRef.current) {
      webRecognitionRef.current.stop()
      webRecognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  // ----- 환경별 분기 -----

  const startListening = isNative ? startNative : startWeb
  const stopListening = isNative ? stopNative : stopWeb

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  }
}
