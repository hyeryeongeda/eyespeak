// ! EyeSpeak — 환자(Patient) STOMP 어댑터 훅
// ? - PatientLayout 레벨에서 호출하여 앱 전역 생명주기에 걸쳐 WS 를 유지한다.
// (보호자와 달리, 환자는 로그인~로그아웃 전 구간에서 메시지를 수신해야 함)
//
// 역할:
// 1. /user/queue/chat 구독 → 수신 메시지를 type 별로 분기
//    - CHAT → onChatMessage 콜백 (PatientIncomingChatProvider 의 dispatch 연결점)
//    - CALL_CONFIRMED → onCallConfirmed 콜백
//
// 2. 채팅 발행 함수 제공
//    - 환자는 contentType='TEXT' | 'PHRASE' | 'EXPRESSION' 모두 사용 가능
//    - PHRASE/EXPRESSION 선택 시 phraseId/exprId 를 포함
//    → 서버가 message 테이블 INSERT + usage_log 테이블 INSERT 를 트랜잭션으로 처리
//
// 3. 호출/SOS 발행 함수 제공
//
// userId(number) 와 matchingId(number|null) 는 AuthSession(authStore) 에서 읽는다.

import { useCallback, useEffect, useRef } from 'react'
import { useStompClient } from './useStompClient'
import { useAuthStore } from '../stores/authStore'
import {
  STOMP_DESTINATIONS,
  parseInboundMessage,
  buildChatPayload,
  buildCallPayload,
  isStompChatInbound,
  isStompCallConfirmed,
} from '../services/websocket'
import type {
  StompChatInbound,
  StompCallConfirmedInbound,
  StompContentType,
  StompConnectionStatus,
  StompCallType,
} from '../services/websocket'

// ----- 콜백 인터페이스 -----

export interface PatientStompCallbacks {
  /** CHAT 메시지 수신 시 호출 */
  onChatMessage?: (payload: StompChatInbound) => void
  /** CALL_CONFIRMED 수신 시 호출 */
  onCallConfirmed?: (payload: StompCallConfirmedInbound) => void
}

// ----- 훅 반환 타입 -----

export interface UsePatientStompReturn {
  /** STOMP 연결 상태 */
  status: StompConnectionStatus
  connected: boolean

  /**
   * 채팅 메시지 발행.
   *
   * contentType 에 따라 서버 처리가 달라진다:
   * - 'TEXT': message 테이블에만 저장
   * - 'PHRASE': message(phrase_id) + usage_log(phrase_id) 동시 저장
   * - 'EXPRESSION': message(expr_id) + usage_log(expr_id) 동시 저장
   */
  sendChat: (params: {
    text: string
    contentType: StompContentType
    phraseId?: number | null
    exprId?: number | null
  }) => void

  /**
   * 호출/SOS 발행.
   * STOMP /app/call 로 전송되며, 서버는 call 테이블에 INSERT 후
   * 무조건 FCM 으로 보호자에게 알린다.
   */
  sendCall: (callType: StompCallType) => void
}

// ----- 훅 -----

export function usePatientStomp(callbacks?: PatientStompCallbacks): UsePatientStompReturn {
  const { client, status } = useStompClient(true)
  const user = useAuthStore(state => state.user)

  const connected = status === 'connected'

  // 콜백을 ref 로 안정화 — 렌더마다 새 객체여도 구독 재생성 방지
  const callbacksRef = useRef(callbacks)

  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

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
          callbacksRef.current?.onChatMessage?.(parsed)
          return
        }

        if (isStompCallConfirmed(parsed)) {
          callbacksRef.current?.onCallConfirmed?.(parsed)
        }
      },
    )

    return () => {
      unsubscribe()
    }
  }, [client, connected])

  // 채팅 발행
  const sendChat = useCallback(
    (params: {
      text: string
      contentType: StompContentType
      phraseId?: number | null
      exprId?: number | null
    }) => {
      if (!client || !connected || !user || user.userId == null || user.matchingId == null) {
        return
      }

      const payload = buildChatPayload({
        matchingId: user.matchingId,
        senderId: user.userId,
        senderRole: 'PATIENT',
        text: params.text,
        contentType: params.contentType,
        phraseId: params.phraseId,
        exprId: params.exprId,
      })

      client.publish(STOMP_DESTINATIONS.PUBLISH_CHAT, payload as unknown as Record<string, unknown>)
    },
    [client, connected, user],
  )

  // 호출/SOS 발행
  const sendCall = useCallback(
    (callType: StompCallType) => {
      if (!client || !connected || !user || user.userId == null || user.matchingId == null) {
        return
      }

      const payload = buildCallPayload({
        matchingId: user.matchingId,
        senderId: user.userId,
        senderRole: 'PATIENT',
        callType,
      })

      client.publish(STOMP_DESTINATIONS.PUBLISH_CALL, payload as unknown as Record<string, unknown>)
    },
    [client, connected, user],
  )

  return {
    status,
    connected,
    sendChat,
    sendCall,
  }
}
