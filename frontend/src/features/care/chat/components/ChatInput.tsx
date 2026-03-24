import { useEffect, useRef, useState } from 'react'
import { useSpeechRecognition } from '../../../../hooks/useSpeechRecognition'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: sttSupported,
  } = useSpeechRecognition()

  // STT transcript가 변경되면 입력창에 반영
  useEffect(() => {
    if (transcript) {
      setText(transcript)
    }
  }, [transcript])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const content = text.trim()
    if (!content) return

    onSend(content)
    setText('')

    if (isListening) {
      stopListening()
    }
  }

  const handleToggleSTT = async () => {
    if (isListening) {
      await stopListening()
    } else {
      await startListening()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-2 border-t border-[#E2E8F0] bg-white"
    >
      {/* STT 버튼 */}
      {sttSupported && (
        <button
          type="button"
          onClick={handleToggleSTT}
          disabled={disabled}
          className={`w-11 shrink-0 min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
          } ${disabled ? 'opacity-50' : ''}`}
          aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
      )}

      {/* 메시지 입력 */}
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isListening ? '듣고 있어요...' : '메시지를 입력하세요'}
        disabled={disabled}
        className="flex-1 min-h-[44px] px-4 py-2 bg-[#F1F5F9] rounded-full text-[15px] text-[#1E293B] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:opacity-50"
      />

      {/* 전송 버튼 */}
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-11 shrink-0 min-h-[44px] flex items-center justify-center rounded-full bg-[#3B82F6] text-white disabled:opacity-40 transition-colors hover:bg-[#2563EB]"
        aria-label="메시지 전송"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  )
}
