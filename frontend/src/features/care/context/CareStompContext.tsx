// ! EyeSpeak — 보호자(Care) STOMP 컨텍스트
// CareLayout 레벨에서 STOMP 연결을 유지하여, 채팅 화면 이탈 후 재진입해도
// 연결이 끊기지 않도록 한다. (환자의 PatientIncomingChatProvider 와 동일한 패턴)

import { createContext, useContext, type ReactNode } from 'react'
import { useStompClient } from '../../../hooks/useStompClient'
import { getActiveApiMode } from '../../../config/env'
import type { EyeSpeakStompClient } from '../../../services/websocket/stompClient'
import type { StompConnectionStatus } from '../../../services/websocket/stompTypes'

interface CareStompContextValue {
  client: EyeSpeakStompClient | null
  status: StompConnectionStatus
  connected: boolean
}

const CareStompContext = createContext<CareStompContextValue | null>(null)

export function CareStompProvider({ children }: { children: ReactNode }) {
  const isMock = getActiveApiMode() === 'mock'
  const { client, status } = useStompClient(!isMock)
  const connected = isMock || status === 'connected'

  return (
    <CareStompContext.Provider value={{ client, status, connected }}>
      {children}
    </CareStompContext.Provider>
  )
}

export function useCareStompContext(): CareStompContextValue {
  const context = useContext(CareStompContext)

  if (!context) {
    throw new Error('useCareStompContext must be used within CareStompProvider')
  }

  return context
}
