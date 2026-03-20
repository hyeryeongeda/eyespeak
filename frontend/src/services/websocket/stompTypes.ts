// ! EyeSpeak — 공통 STOMP WebSocket 타입 정의
// ? - 환자·보호자 양쪽 모두에서 사용하는 프로토콜 레벨 타입.
// - UI 전용 타입(PatientChatMessage, ChatMessage 등)과 분리하여 STOMP 메시지 직렬화/역직렬화에만 집중함
// - 모든 ID 필드는 ERD bigint 와 매핑되며, STOMP 에서는 number 로 전달한다.

// ----- Enum / Literal 유니온 -----

/* STOMP 수신 메시지의 type 필드 (서버 → 클라이언트) */
export type StompInboundType = 'CHAT' | 'CALL_CONFIRMED'

/* STOMP 발행 메시지의 type 필드 (클라이언트 → 서버) */
export type StompOutboundType = 'CHAT' | 'CALL' | 'SOS'

/** ERD content_type enum — message 테이블의 content_type 컬럼과 1:1 */
export type StompContentType = 'TEXT' | 'PHRASE' | 'EXPRESSION'

/** ERD role enum */
export type StompSenderRole = 'PATIENT' | 'GUARDIAN'

/** ERD call_type enum */
export type StompCallType = 'NORMAL' | 'SOS'

// ----- 수신 (Inbound) -----

/**
 * /user/queue/chat 으로 수신되는 CHAT 메시지.
 *
 * 서버가 message 테이블에 INSERT 한 뒤 상대방에게 전달하는 포맷.
 * ERD message 테이블의 모든 주요 컬럼이 매핑되어 있다.
 */
export interface StompChatInbound {
  type: 'CHAT'
  /** matching.id — 환자-보호자 쌍 식별 */
  matchingId: number
  /** message.id — 메시지 PK (클라이언트에서 중복 방지용) */
  messageId: number
  /** user.id — 발신자 유저 ID */
  senderId: number
  /** message.sender_role — PATIENT 또는 GUARDIAN */
  senderRole: StompSenderRole
  /** message.content_type — TEXT / PHRASE / EXPRESSION */
  contentType: StompContentType
  /** message.content — 메시지 본문 */
  text: string
  /** message.phrase_id → phrase.id FK. PHRASE 타입일 때만 값 존재 */
  phraseId: number | null
  /** message.expr_id → expressions.id FK. EXPRESSION 타입일 때만 값 존재 */
  exprId: number | null
  /** message.is_read — 초기값 항상 false */
  isRead: boolean
  /** message.created_at — ISO 8601 */
  createdAt: string
}

/**
 * /user/queue/chat 으로 수신되는 CALL_CONFIRMED 메시지.
 *
 * 보호자가 REST /api/calls/{callId}/confirm 호출 시 서버가 환자에게 전달.
 */
export interface StompCallConfirmedInbound {
  type: 'CALL_CONFIRMED'
  /** matching.id */
  matchingId: number
  /** user.id — 확인한 보호자 유저 ID */
  senderId: number
  /** 고정값 'GUARDIAN' */
  senderRole: StompSenderRole
  /** 확인 메시지 본문 */
  body: string
  /** call.id — 확인된 호출 PK */
  callId: number
  /** call.type — ERD call_type enum 그대로 (NORMAL / SOS) */
  callType: StompCallType
  /** 확인 시각 ISO 8601 */
  createdAt: string
}

/** 수신 메시지 유니온 — type 필드로 디스크리미네이트 */
export type StompInboundMessage = StompChatInbound | StompCallConfirmedInbound

// ----- 발행 (Outbound) -----

/**
 * /app/chat 으로 발행하는 채팅 메시지.
 *
 * 환자와 보호자가 동일한 구조를 사용한다.
 * - 보호자: contentType='TEXT' 만 사용, phraseId/exprId 항상 null
 * - 환자:   contentType='TEXT' | 'PHRASE' | 'EXPRESSION'
 *
 * 서버 사이드 이펙트:
 * - 모든 메시지 → message 테이블 INSERT
 * - 환자 발신 → 추가로 usage_log INSERT (+ EXPRESSION 일 때 expressions.last_used UPDATE)
 * - 보호자 발신 → usage_log 기록 없음
 */
export interface StompPublishChat {
  type: 'CHAT'
  /** matching.id */
  matchingId: number
  /** user.id — 발신자 유저 ID */
  senderId: number
  /** PATIENT 또는 GUARDIAN */
  senderRole: StompSenderRole
  /** message.content — 메시지 본문 */
  text: string
  /** message.content_type */
  contentType: StompContentType
  /** phrase.id — contentType=PHRASE 일 때만 값 전달 */
  phraseId?: number | null
  /** expressions.id — contentType=EXPRESSION 일 때만 값 전달 */
  exprId?: number | null
}

/** /app/call 로 발행하는 호출/SOS 메시지 (환자만 발행) */
export interface StompPublishCall {
  /** STOMP type: 'CALL'(=NORMAL) 또는 'SOS' */
  type: 'CALL' | 'SOS'
  /** matching.id */
  matchingId: number
  /** user.id — 환자 유저 ID */
  senderId: number
  /** 고정값 'PATIENT' */
  senderRole: StompSenderRole
}

/** 발행 메시지 유니온 */
export type StompOutboundMessage = StompPublishChat | StompPublishCall

// 연결 상태
export type StompConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// * STOMP 연결 설정 */
export interface StompClientConfig {
  // WebSocket 엔드포인트 URL (예: wss://api.eyespeak.com/ws)
  wsUrl: string
  /* JWT access token */
  accessToken: string
  /* WS 인증 방식 — BE 미확정이므로 두 방식 모두 지원 */
  authMode: 'header' | 'query' | 'both'
  /* 재연결 딜레이 (ms). 기본 5000 */
  reconnectDelay?: number
  /* 하트비트 수신 간격 (ms). 기본 10000 */
  heartbeatIncoming?: number
  /* 하트비트 송신 간격 (ms). 기본 10000 */
  heartbeatOutgoing?: number
}

// 타입 가드
export function isStompChatInbound(msg: StompInboundMessage): msg is StompChatInbound {
  return msg.type === 'CHAT'
}

export function isStompCallConfirmed(msg: StompInboundMessage): msg is StompCallConfirmedInbound {
  return msg.type === 'CALL_CONFIRMED'
}
