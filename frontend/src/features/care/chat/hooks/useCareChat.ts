// ! EyeSpeak — 보호자(Care) 채팅 어댑터 훅
// ? - 보호자 채팅 화면(ChatPage) 에서만 사용한다.
// - mount 시 STOMP 연결 → /user/queue/chat 구독 + REST 히스토리 로드
// - unmount 시 구독 해제 + 연결 해제
// - STOMP raw 메시지를 care 전용 ChatMessage 타입으로 변환하며,
//   CALL_CONFIRMED 는 notificationStore 로 위임한다.
// - 보호자는 contentType='TEXT' 만 발행하므로 phraseId/exprId 를 보내지 않는다.
// - userId(number) 와 matchingId(number|null) 는 AuthSession(authStore) 에서 읽는다.
// - mock 모드에서는 STOMP 없이도 메시지 전송/수신을 로컬로 처리한다.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStompClient } from '../../../../hooks/useStompClient'
import { useAuthStore } from '../../../../stores/authStore'
import { useNotificationStore } from '../../../../shared/stores/notificationStore'
import { getActiveApiMode } from '../../../../config/env'
import {
  STOMP_DESTINATIONS,
  parseChatMessage,
  parseCallConfirmedMessage,
  buildChatPayload,
} from '../../../../services/websocket'
import type { StompChatInbound } from '../../../../services/websocket'
import type { ChatMessage } from '../../types/chat'
import { useChatHistory } from './useChatHistory'

// ----- STOMP → Care ChatMessage 변환 -----

function toCareMessage(payload: StompChatInbound): ChatMessage {
  return {
    id: String(payload.messageId),
    senderId: String(payload.senderId),
    senderRole: payload.senderRole === 'PATIENT' ? 'patient' : 'care',
    content: payload.text,
    contentType: payload.contentType,
    sentAt: payload.createdAt,
  }
}

let mockMessageIdCounter = 1000

// ----- 훅 반환 타입 -----

export interface UseCareChatReturn {
  connected: boolean
  messages: ChatMessage[]
  sendMessage: (content: string) => void
  isLoading: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
}

// ----- 훅 -----

export function useCareChat(): UseCareChatReturn {
  const isMock = getActiveApiMode() === 'mock'
  const { client, status } = useStompClient(!isMock)
  const user = useAuthStore(state => state.user)
  const pushNotification = useNotificationStore(state => state.pushNotification)

  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([])
  const knownIdsRef = useRef<Set<string>>(new Set())

  const connected = isMock || status === 'connected'

  // REST 히스토리
  const {
    messages: historyMessages,
    isLoading,
    hasMore,
    loadInitial,
    loadMore,
  } = useChatHistory()

  // 히스토리 초기 로드
  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  // 히스토리 메시지 ID를 knownIds에 등록 (중복 방지)
  useEffect(() => {
    for (const msg of historyMessages) {
      knownIdsRef.current.add(msg.id)
    }
  }, [historyMessages])

  // [DEBUG] 서버 에러 구독 — 배포 확인 후 제거
  useEffect(() => {
    if (isMock || !client || !connected) {
      return
    }

    const unsubErrors = client.subscribe('/user/queue/errors', (msg) => {
      console.error('[STOMP ERROR]', msg.body)
    })

    return () => {
      unsubErrors()
    }
  }, [isMock, client, connected])

  // 채팅 메시지 구독 (/user/queue/chat)
  useEffect(() => {
    if (isMock || !client || !connected) {
      return
    }

    const unsubscribe = client.subscribe(
      STOMP_DESTINATIONS.SUBSCRIBE_CHAT,
      (stompMsg) => {
        const parsed = parseChatMessage(stompMsg)

        if (!parsed) {
          return
        }

        const careMsg = toCareMessage(parsed)

        if (knownIdsRef.current.has(careMsg.id)) {
          return
        }
        knownIdsRef.current.add(careMsg.id)

        setRealtimeMessages(prev => [...prev, careMsg])
      },
    )

    return () => {
      unsubscribe()
    }
  }, [isMock, client, connected])

  // 호출 확인 구독 (/user/queue/call)
  useEffect(() => {
    if (isMock || !client || !connected) {
      return
    }

    const unsubscribe = client.subscribe(
      STOMP_DESTINATIONS.SUBSCRIBE_CALL,
      (stompMsg) => {
        const parsed = parseCallConfirmedMessage(stompMsg)

        if (!parsed) {
          return
        }

        pushNotification({
          type: parsed.callType === 'SOS' ? 'SOS' : 'CALL',
          title: parsed.callType === 'SOS' ? 'SOS 확인' : '호출 확인',
          body: parsed.body,
          matchingId: parsed.matchingId,
          senderId: String(parsed.senderId),
          senderRole: parsed.senderRole,
          callId: parsed.callId,
        })
      },
    )

    return () => {
      unsubscribe()
    }
  }, [isMock, client, connected, pushNotification])

  // 메시지 발행
  const sendMessage = useCallback(
    (content: string) => {
      if (!user || user.userId == null || user.matchingId == null) {
        return
      }

      if (isMock) {
        // Mock 모드: 로컬에 메시지 추가
        const mockId = String(++mockMessageIdCounter)
        const mockMsg: ChatMessage = {
          id: mockId,
          senderId: String(user.userId),
          senderRole: 'care',
          content,
          contentType: 'TEXT',
          sentAt: new Date().toISOString(),
        }
        setRealtimeMessages(prev => [...prev, mockMsg])
        return
      }

      // Real 모드: STOMP 발행
      if (!client || !connected) {
        return
      }

      const payload = buildChatPayload({
        matchingId: user.matchingId,
        text: content,
        contentType: 'TEXT',
      })

      client.publish(STOMP_DESTINATIONS.PUBLISH_CHAT, payload)
    },
    [isMock, client, connected, user],
  )

  // 히스토리 + 실시간 메시지 병합
  const messages = [...historyMessages, ...realtimeMessages]

  return {
    connected,
    messages,
    sendMessage,
    isLoading,
    hasMore,
    loadMore,
  }
}
