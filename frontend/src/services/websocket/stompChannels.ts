// ============================================================
// EyeSpeak — STOMP 채널 상수 & 메시지 파서
// ============================================================
// 구독/발행 destination 을 상수화하고,
// 수신 메시지의 JSON → 타입 변환 유틸을 제공한다.
// ID 필드는 모두 number (ERD bigint 매핑).
// ============================================================

import type { IMessage } from '@stomp/stompjs'
import type {
  StompCallType,
  StompContentType,
  StompInboundMessage,
  StompPublishCall,
  StompPublishChat,
  StompSenderRole,
} from './stompTypes'

// ----- STOMP Destinations -----

export const STOMP_DESTINATIONS = {
  /** 채팅 메시지 발행 (환자·보호자 공통) */
  PUBLISH_CHAT: '/app/chat',
  /** 호출/SOS 발행 (환자 전용이지만, 상수는 공통 레이어에 정의) */
  PUBLISH_CALL: '/app/call',
  /** 개인 큐 구독 — CHAT + CALL_CONFIRMED 수신 */
  SUBSCRIBE_PERSONAL: '/user/queue/chat',
} as const

// ----- 수신 메시지 파서 -----

/**
 * STOMP IMessage.body (JSON 문자열) → StompInboundMessage 파싱.
 *
 * 파싱 실패 시 null 을 반환하므로 호출 측에서 null 체크 필요.
 * 알 수 없는 type 이면 역시 null (forward-compatibility).
 */
export function parseInboundMessage(stompMessage: IMessage): StompInboundMessage | null {
  try {
    const raw: unknown = JSON.parse(stompMessage.body)

    if (!raw || typeof raw !== 'object') {
      return null
    }

    const obj = raw as Record<string, unknown>
    const type = obj.type

    if (type === 'CHAT' || type === 'CALL_CONFIRMED') {
      return obj as unknown as StompInboundMessage
    }

    // 서버에서 새로운 type 이 추가되더라도 프론트가 크래시되지 않도록 null 반환
    return null
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[STOMP] 메시지 파싱 실패:', stompMessage.body)
    }
    return null
  }
}

// ----- 발행 페이로드 빌더 -----

/**
 * 채팅 메시지 발행 페이로드를 생성한다.
 *
 * 보호자는 contentType='TEXT' 만 사용하므로 phraseId/exprId 를 보내지 않는다.
 * 환자는 PHRASE/EXPRESSION 선택 시 해당 ID 를 포함하며,
 * 서버는 이를 message 테이블 + usage_log 테이블에 동시 기록한다.
 *
 * matchingId, senderId 는 ERD bigint 에 매핑되므로 number 타입이다.
 */
export function buildChatPayload(params: {
  matchingId: number
  senderId: number
  senderRole: StompSenderRole
  text: string
  contentType: StompContentType
  phraseId?: number | null
  exprId?: number | null
}): StompPublishChat {
  const payload: StompPublishChat = {
    type: 'CHAT',
    matchingId: params.matchingId,
    senderId: params.senderId,
    senderRole: params.senderRole,
    text: params.text,
    contentType: params.contentType,
  }

  // null/undefined 필드는 JSON 직렬화 시 생략되므로 명시적 할당
  if (params.phraseId != null) {
    payload.phraseId = params.phraseId
  }

  if (params.exprId != null) {
    payload.exprId = params.exprId
  }

  return payload
}

/**
 * 호출/SOS 발행 페이로드를 생성한다.
 * callType 은 ERD call_type enum (NORMAL | SOS) 이며,
 * STOMP type 필드는 'CALL' | 'SOS' 로 매핑된다.
 */
export function buildCallPayload(params: {
  matchingId: number
  senderId: number
  senderRole: StompSenderRole
  callType: StompCallType
}): StompPublishCall {
  return {
    type: params.callType === 'SOS' ? 'SOS' : 'CALL',
    matchingId: params.matchingId,
    senderId: params.senderId,
    senderRole: params.senderRole,
  }
}
