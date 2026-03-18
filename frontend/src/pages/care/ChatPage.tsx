import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CARE_ROUTE_PATHS } from '../../app/router/routePaths'
import type { ChatMessage, SttState } from '../../types/care'

// 목업 초기 메시지
const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', sender: 'patient', text: '배가 고파요', timestamp: new Date() },
  { id: '2', sender: 'guardian', text: '지금 바로 죽 준비해드릴게요!', timestamp: new Date() },
  { id: '3', sender: 'patient', text: '고마워요. 천천히 드세요.', timestamp: new Date() },
]

export default function ChatPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [inputText, setInputText] = useState('')
  const [sttState, setSttState] = useState<SttState>('idle')
  const [sttPreview, setSttPreview] = useState('')
  const [showStt, setShowStt] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sttTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const STT_SAMPLES = [
    '지금 어디 계세요?',
    '밥은 드셨어요?',
    '오늘 컨디션이 어때요?',
    '잠시 후 올게요',
    '다, 알겠습니다',
  ]

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // STT cleanup
  useEffect(() => {
    return () => {
      if (sttTimerRef.current) clearInterval(sttTimerRef.current)
    }
  }, [])

  function sendMessage() {
    const text = inputText.trim()
    if (!text) return
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), sender: 'guardian', text, timestamp: new Date() },
    ])
    setInputText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') sendMessage()
  }

  // STT
  function openStt() {
    setShowStt(true)
    setSttState('idle')
    setSttPreview('')
  }

  function closeStt() {
    stopRecording()
    setShowStt(false)
    setSttState('idle')
    setSttPreview('')
  }

  function toggleRecord() {
    if (sttState === 'recording') {
      stopRecording()
    } else {
      startRecording()
    }
  }

  function startRecording() {
    setSttState('recording')
    setSttPreview('')
    if (sttTimerRef.current) clearInterval(sttTimerRef.current)

    const sample = STT_SAMPLES[Math.floor(Math.random() * STT_SAMPLES.length)]
    let i = 0
    sttTimerRef.current = setInterval(() => {
      if (i < sample.length) {
        i++
        setSttPreview(sample.slice(0, i))
      } else {
        if (sttTimerRef.current) clearInterval(sttTimerRef.current)
        setSttState('done')
        setSttPreview(sample)
      }
    }, 80)
  }

  function stopRecording() {
    if (sttTimerRef.current) clearInterval(sttTimerRef.current)
    if (sttState === 'recording') setSttState('idle')
  }

  function confirmStt() {
    setInputText(sttPreview)
    closeStt()
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#FEFEFE]">
      {/* 상단 헤더 */}
      <header className="flex items-center gap-[10px] px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate(CARE_ROUTE_PATHS.CARE_HOME)}
          className="text-[20px] text-[#3D405B] min-h-[44px] min-w-[44px] flex items-center"
          aria-label="뒤로가기"
        >
          ←
        </button>
        <span className="text-[17px] font-bold text-[#3D405B]">김길동 환자</span>
        <div className="w-2.5 h-2.5 rounded-full bg-[#48BB78] ml-0.5" />
      </header>

      {/* 채팅 메시지 영역 */}
      <main className="flex-1 overflow-y-auto px-[14px] py-[14px] flex flex-col gap-[10px] bg-[#F0F4F8]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-end ${msg.sender === 'guardian' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`max-w-[72%] px-[13px] py-[9px] text-[13px] leading-[1.5] ${
                msg.sender === 'guardian'
                  ? 'bg-[#3D405B] text-white rounded-[14px_4px_14px_14px]'
                  : 'bg-[#FEFEFE] text-[#1A202C] rounded-[4px_14px_14px_14px]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </main>

      {/* STT 패널 */}
      {showStt && (
        <div className="flex-shrink-0 bg-[#FEFEFE] border-t-2 border-[#3D405B] px-5 py-4 flex flex-col items-center gap-[10px]">
          {/* 파형 애니메이션 */}
          <div className="flex items-center justify-center gap-[3px] h-10">
            {[8, 18, 30, 22, 10, 26, 14].map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-sm bg-[#3D405B] transition-transform ${
                  sttState === 'recording' ? 'animate-bounce' : ''
                }`}
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: '0.7s',
                }}
              />
            ))}
          </div>

          {/* 상태 텍스트 */}
          <p
            className={`text-[13px] ${
              sttState === 'recording' ? 'text-[#E53E3E] font-bold' : 'text-[#718096]'
            }`}
          >
            {sttState === 'idle' && '버튼을 눌러 말씀하세요'}
            {sttState === 'recording' && '듣고 있어요...'}
            {sttState === 'done' && '인식 완료 · 확인 후 전송하세요'}
          </p>

          {/* 인식 결과 미리보기 */}
          <p className="text-[14px] font-bold text-[#1A202C] min-h-5 text-center">{sttPreview}</p>

          {/* 큰 마이크 버튼 */}
          <button
            type="button"
            onClick={toggleRecord}
            className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all ${
              sttState === 'recording'
                ? 'bg-[#E53E3E] shadow-[0_0_0_0_rgba(229,62,62,0.4)] animate-pulse'
                : 'bg-[#3D405B]'
            }`}
            aria-label={sttState === 'recording' ? '녹음 중지' : '녹음 시작'}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="11" rx="3" fill="white" />
              <path
                d="M5 11a7 7 0 0014 0"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="22" x2="15" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* 완료 시 버튼 */}
          {sttState === 'done' && (
            <div className="flex gap-[10px] w-full">
              <button
                type="button"
                onClick={closeStt}
                className="flex-1 py-[10px] rounded-[10px] bg-[#F0F4F8] text-[#718096] text-[13px] font-bold min-h-[44px]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmStt}
                className="flex-1 py-[10px] rounded-[10px] bg-[#3D405B] text-white text-[13px] font-bold min-h-[44px]"
              >
                입력하기
              </button>
            </div>
          )}

          {/* idle/recording 시 키보드로 돌아가기 */}
          {sttState !== 'done' && (
            <button
              type="button"
              onClick={closeStt}
              className="w-full py-[10px] rounded-[10px] bg-[#F0F4F8] text-[#718096] text-[13px] font-bold min-h-[44px]"
            >
              ← 키보드로 돌아가기
            </button>
          )}
        </div>
      )}

      {/* 입력 바 */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[#FEFEFE] border-t border-[#E2E8F0]">
        {/* STT 버튼 */}
        <button
          type="button"
          onClick={openStt}
          className="w-[38px] h-[38px] rounded-full bg-[#3D405B] flex items-center justify-center flex-shrink-0"
          aria-label="음성 입력"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="11" rx="3" fill="white" />
            <path d="M5 11a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="22" x2="15" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* 텍스트 입력 */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
          className="flex-1 px-[14px] py-[9px] rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#1A202C] outline-none focus:border-[#3D405B]"
        />

        {/* 전송 버튼 */}
        <button
          type="button"
          onClick={sendMessage}
          className="w-[38px] h-[38px] rounded-full bg-[#3D405B] flex items-center justify-center flex-shrink-0"
          aria-label="전송"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
