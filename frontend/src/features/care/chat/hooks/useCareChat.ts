// ! EyeSpeak — 보호자(Care) 채팅 어댑터 훅
// ? - 보호자 채팅 화면(ChatPage) 에서만 사용한다.
// - mount 시 STOMP 연결 → /user/queue/chat 구독
// - unmount 시 구독 해제 + 연결 해제
// - STOMP raw 메시지를 care 전용 ChatMessage 타입으로 변환하며,
//   CALL_CONFIRMED 는 notificationStore 로 위임한다.
// - 보호자는 contentType='TEXT' 만 발행하므로 phraseId/exprId 를 보내지 않는다.
// - userId(number) 와 matchingId(number|null) 는 AuthSession(authStore) 에서 읽는다.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStompClient } from '../../../../hooks/useStompClient'
import { useAuthStore } from '../../../../stores/authStore'
import { useNotificationStore } from '../../../../shared/stores/notificationStore'
import {
  STOMP_DESTINATIONS,
  parseInboundMessage,
  buildChatPayload,
  isStompChatInbound,
  isStompCallConfirmed,
} from '../../../../services/websocket'
import type { StompChatInbound } from '../../../../services/websocket'
import type { ChatMessage } from '../../types/chat'

// ----- STOMP → Care ChatMessage 변환 -----

function toCareMessage(payload: StompChatInbound): ChatMessage {
  return {
    id: String(payload.messageId),
    senderId: String(payload.senderId),
    senderRole: payload.senderRole === 'PATIENT' ? 'patient' : 'care',
    content: payload.text,
    sentAt: payload.createdAt,
  }
}

// ----- 훅 반환 타입 -----

export interface UseCareChatReturn {
  /** STOMP 연결 상태 */
  connected: boolean
  /** 수신된 메시지 목록 (WS 실시간 메시지만. 히스토리는 REST 로 별도 로드) */
  messages: ChatMessage[]
  /** 텍스트 메시지 전송 */
  sendMessage: (content: string) => void
}

// ----- 훅 -----

export function useCareChat(): UseCareChatReturn {
  const { client, status } = useStompClient(true)
  const user = useAuthStore(state => state.user)
  const showNotification = useNotificationStore(state => state.showNotification)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const knownIdsRef = useRef<Set<string>>(new Set())

  const connected = status === 'connected'

  // 구독
  useEffect(() => {
    if (!client || !connected) {
      return
    }

    const unsubscribe = client.subscribe(
      STOMP_DESTINATIONS.SUBSCRIBE_PERSONAL,
      (stompMsg) => {
        const parsed = parseInboundMessage(stompMsg)

        if (!parsed) {
          return
        }

        if (isStompChatInbound(parsed)) {
          const careMsg = toCareMessage(parsed)

          // 중복 메시지 방지
          if (knownIdsRef.current.has(careMsg.id)) {
            return
          }
          knownIdsRef.current.add(careMsg.id)

          setMessages(prev => [...prev, careMsg])
          return
        }

        if (isStompCallConfirmed(parsed)) {
          showNotification({
            type: parsed.callType === 'SOS' ? 'SOS' : 'CALL',
            title: parsed.callType === 'SOS' ? 'SOS 확인' : '호출 확인',
            body: parsed.body,
            matchingId: parsed.matchingId,
            senderId: String(parsed.senderId),
            senderRole: parsed.senderRole,
            callId: parsed.callId,
          })
        }
      },
    )

    return () => {
      unsubscribe()
    }
  }, [client, connected, showNotification])

  // 메시지 발행
  const sendMessage = useCallback(
    (content: string) => {
      if (!client || !connected || !user || user.matchingId == null) {
        return
      }

      const payload = buildChatPayload({
        matchingId: user.matchingId,
        senderId: user.userId,
        senderRole: 'GUARDIAN',
        text: content,
        contentType: 'TEXT',
        // 보호자는 phraseId/exprId 를 보내지 않는다 → usage_log 기록 없음
      })

      client.publish(STOMP_DESTINATIONS.PUBLISH_CHAT, payload as unknown as Record<string, unknown>)
    },
    [client, connected, user],
  )

  return {
    connected,
    messages,
    sendMessage,
  }
}
