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
  StompChatInbound,
  StompCallConfirmedInbound,
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
  /** 채팅 메시지 수신 (개인 큐) */
  SUBSCRIBE_CHAT: '/user/queue/chat',
  /** 호출 확인 수신 (개인 큐) */
  SUBSCRIBE_CALL: '/user/queue/call',
} as const

// ----- 수신 메시지 파서 -----

/**
 * /user/queue/chat 채널에서 수신한 메시지를 StompChatInbound 로 파싱.
 *
 * 채널이 분리되어 있으므로 type 필드 없이도 CHAT 으로 확정한다.
 * 백엔드 ChatMessageResponse 의 timestamp → createdAt 매핑도 여기서 처리.
 */
export function parseChatMessage(stompMessage: IMessage): StompChatInbound | null {
  try {
    const raw: unknown = JSON.parse(stompMessage.body)

    if (!raw || typeof raw !== 'object') {
      return null
    }

    const obj = raw as Record<string, unknown>

    return {
      type: 'CHAT',
      matchingId: obj.matchingId as number,
      messageId: obj.messageId as number,
      senderId: obj.senderId as number,
      senderRole: obj.senderRole as StompChatInbound['senderRole'],
      contentType: obj.contentType as StompChatInbound['contentType'],
      text: obj.text as string,
      phraseId: (obj.phraseId as number) ?? null,
      exprId: (obj.exprId as number) ?? null,
      isRead: (obj.isRead as boolean) ?? false,
      // 백엔드가 timestamp 으로 보내면 createdAt 으로 매핑
      createdAt: (obj.createdAt ?? obj.timestamp) as string,
    }
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[STOMP] 채팅 메시지 파싱 실패:', stompMessage.body)
    }
    return null
  }
}

/**
 * /user/queue/call 채널에서 수신한 메시지를 StompCallConfirmedInbound 로 파싱.
 *
 * 채널이 분리되어 있으므로 type 필드 없이도 CALL_CONFIRMED 로 확정한다.
 */
export function parseCallConfirmedMessage(stompMessage: IMessage): StompCallConfirmedInbound | null {
  try {
    const raw: unknown = JSON.parse(stompMessage.body)

    if (!raw || typeof raw !== 'object') {
      return null
    }

    const obj = raw as Record<string, unknown>

    return {
      type: 'CALL_CONFIRMED',
      matchingId: obj.matchingId as number,
      senderId: obj.senderId as number,
      senderRole: (obj.senderRole as StompCallConfirmedInbound['senderRole']) ?? 'GUARDIAN',
      body: obj.body as string,
      callId: obj.callId as number,
      callType: obj.callType as StompCallConfirmedInbound['callType'],
      createdAt: (obj.createdAt ?? obj.acknowledgedAt ?? obj.timestamp) as string,
    }
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[STOMP] 호출 확인 메시지 파싱 실패:', stompMessage.body)
    }
    return null
  }
}

/**
 * @deprecated 채널 분리 후 parseChatMessage / parseCallConfirmedMessage 를 사용.
 * 하위 호환을 위해 남겨둠.
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
