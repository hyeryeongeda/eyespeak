# EyeSpeak WebSocket (STOMP) 공통 세팅 가이드

> 작성일: 2026-03-20
> 대상: 프론트엔드 팀 (보호자 앱 + 환자 웹)
> 기반 문서: `guardian-communication-structure.md`, `eyespeak_erd_final.dbml`, `CLAUDE.md`

---

## 1. 왜 공통 세팅이 필요한가

EyeSpeak 은 환자와 보호자가 **동일한 STOMP 채널**(`/app/chat`, `/app/call`, `/user/queue/chat`)을 사용한다. 하지만 두 역할은 연결 생명주기, 메시지 콘텐츠 타입, 서버 사이드 이펙트(usage_log 기록 여부)가 크게 다르다.

| 구분 | 보호자 (Care) | 환자 (Patient) |
|------|--------------|----------------|
| 연결 시점 | 채팅 화면 진입 | 로그인 시 (전체 화면 상시) |
| 해제 시점 | 채팅 화면 이탈 | 로그아웃 / 브라우저 종료 |
| 발행 contentType | `TEXT` 만 사용 | `TEXT` / `PHRASE` / `EXPRESSION` |
| phraseId / exprId | 보내지 않음 | PHRASE/EXPRESSION 선택 시 포함 |
| usage_log 기록 | 없음 | 서버가 phraseId/exprId 기반으로 INSERT |
| CHAT 수신 처리 | 채팅 목록에 추가 | 인터럽트 오버레이 + 응답 모드 |
| CALL_CONFIRMED 수신 | notificationStore 위임 | 환자 화면 피드백 (미확정) |

이런 차이 때문에 **"프로토콜 레벨은 공유하되, 연결 생명주기와 메시지 변환은 각 역할이 담당"** 하는 구조로 설계했다.

---

## 2. 아키텍처 개요

```
┌─────────────────────────────────────────────────┐
│                   공통 레이어                      │
│  services/websocket/                             │
│    stompTypes.ts      ← 프로토콜 타입 정의         │
│    stompClient.ts     ← @stomp/stompjs 래퍼       │
│    stompChannels.ts   ← 채널 상수 + 파서/빌더      │
│    index.ts           ← 배럴 export               │
│                                                   │
│  hooks/                                           │
│    useStompClient.ts  ← 연결 생명주기 공통 훅       │
└──────────────┬──────────────────┬────────────────┘
               │                  │
    ┌──────────▼──────┐  ┌───────▼──────────┐
    │  보호자 어댑터     │  │  환자 어댑터       │
    │  useCareChat.ts  │  │  usePatientStomp  │
    │  (채팅 화면 스코프) │  │  (앱 전역 스코프)  │
    └─────────────────┘  └──────────────────┘
```

### 레이어 규칙

- **공통 레이어는 역할(role)을 모른다.** `PATIENT` / `GUARDIAN` 을 타입으로만 선언하고, 분기 로직은 포함하지 않는다.
- **어댑터 훅만 역할을 안다.** STOMP raw 메시지 → UI 타입 변환, 연결 스코프 결정, 사이드 이펙트 처리를 담당한다.
- **useEffect cleanup 필수.** CLAUDE.md 코딩 규칙에 따라 모든 구독/연결은 cleanup 함수에서 정리한다.

---

## 3. 파일 상세 설명

### 3.1 `services/websocket/stompTypes.ts`

STOMP 프로토콜 레벨의 타입만 정의한다. UI 전용 타입(`PatientChatMessage`, `ChatMessage`)과 완전히 분리되어 있다.

**ERD 와의 매핑:**

| STOMP 타입 필드 | ERD 테이블/컬럼 | 설명 |
|----------------|----------------|------|
| `StompContentType` | `message.content_type` | `TEXT` / `PHRASE` / `EXPRESSION` |
| `StompSenderRole` | `message.sender_role` (= `user.role`) | `PATIENT` / `GUARDIAN` |
| `StompCallType` | `call.type` | `NORMAL` / `SOS` |
| `StompChatInbound.messageId` | `message.id` | 서버가 INSERT 후 반환 |
| `StompChatInbound.phraseId` | `message.phrase_id` | PHRASE 타입일 때만 값 존재 |
| `StompChatInbound.exprId` | `message.expr_id` | EXPRESSION 타입일 때만 값 존재 |

**ERD 정합성:** `guardian-communication-structure.md` 가 ERD 기준으로 업데이트되었으며, 모든 필드는 ERD `message` 테이블과 1:1 매핑된다. `messageId`, `contentType`, `isRead`, `createdAt` 은 required 필드이고, `phraseId`/`exprId` 는 `number | null` 이다. 모든 ID 필드는 ERD bigint 에 매핑되어 `number` 타입이다.

```typescript
// 수신 메시지 유니온 — type 필드로 디스크리미네이트
export type StompInboundMessage = StompChatInbound | StompCallConfirmedInbound

// 타입 가드
export function isStompChatInbound(msg: StompInboundMessage): msg is StompChatInbound
export function isStompCallConfirmed(msg: StompInboundMessage): msg is StompCallConfirmedInbound
```

### 3.2 `services/websocket/stompClient.ts`

`@stomp/stompjs` 의 `Client` 를 래핑하여 프로젝트 전용 설정을 캡슐화한다.

**핵심 설계 결정:**

- **SockJS 미사용.** Capacitor Android + 환자 웹 모두 네이티브 WebSocket 을 지원하므로 SockJS 가 불필요하다. 번들 크기를 줄인다.
- **인증 이중 대응.** BE 미확정(Header vs Query Param)이므로 `authMode: 'both'` 설정으로 양쪽 모두 토큰을 전달한다. 확정 후 한쪽만 제거하면 된다.
- **재연결 자동 처리.** `@stomp/stompjs` 내장 reconnect 를 활용한다 (기본 5초).
- **연결 타이밍은 외부 제어.** `activate()` / `deactivate()` 를 노출하고, 호출 시점은 `useStompClient` 훅이 결정한다.

```typescript
// 팩토리 함수
createStompClient(config: StompClientConfig, callbacks?: StompClientCallbacks)
  → EyeSpeakStompClient

// 반환되는 래핑 클라이언트
interface EyeSpeakStompClient {
  raw: Client                 // 직접 접근 필요 시
  activate(): void
  deactivate(): Promise<void>
  publish(destination, body): void
  subscribe(destination, callback): () => void  // unsubscribe 함수 반환
}
```

**환경 변수:**

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `VITE_WS_BASE_URL` | `''` (현재 호스트) | WebSocket 서버 주소 |
| `VITE_WS_ENDPOINT` | `/ws` | STOMP 엔드포인트 경로 |
| `VITE_WS_AUTH_MODE` | `both` | `header` / `query` / `both` |

### 3.3 `services/websocket/stompChannels.ts`

STOMP destination 상수와 메시지 파싱/빌드 유틸을 제공한다.

**채널 상수:**

```typescript
STOMP_DESTINATIONS = {
  PUBLISH_CHAT: '/app/chat',       // 채팅 발행 (환자·보호자 공통)
  PUBLISH_CALL: '/app/call',       // 호출/SOS 발행
  SUBSCRIBE_PERSONAL: '/user/queue/chat', // 개인 큐 구독
}
```

**파서:**

```typescript
// JSON 파싱 + type 디스크리미네이트. 실패 시 null 반환 (크래시 방지)
parseInboundMessage(stompMessage: IMessage): StompInboundMessage | null
```

알 수 없는 `type` 이 오면 null 을 반환한다. 서버에서 새 type 을 추가해도 프론트가 크래시되지 않는다.

**빌더:**

```typescript
// 채팅 — 보호자는 phraseId/exprId 생략, 환자는 포함 가능
buildChatPayload(params): StompPublishChat

// 호출 — callType 을 STOMP type 으로 매핑 (NORMAL→'CALL', SOS→'SOS')
buildCallPayload(params): StompPublishCall
```

### 3.4 `hooks/useStompClient.ts`

STOMP 연결 생명주기를 담당하는 공통 훅이다. **역할을 모르고**, 오직 `enabled` 플래그와 `accessToken` 존재 여부에 따라 연결/해제를 수행한다.

```typescript
useStompClient(enabled?: boolean): {
  client: EyeSpeakStompClient | null
  status: StompConnectionStatus
  reconnect: () => void
}
```

**연결 트리거:**

- `accessToken` 변경 시 (로그인, 토큰 갱신)
- `enabled` 변경 시

**해제 트리거:**

- 훅이 unmount 될 때 (useEffect cleanup)
- `enabled` 가 `false` 로 변경될 때
- `accessToken` 이 null 이 될 때 (로그아웃)

### 3.5 `features/care/chat/hooks/useCareChat.ts` — 보호자 어댑터

보호자 채팅 화면(ChatPage)에서만 사용하는 어댑터 훅이다. 파라미터 없이 호출하며, `userId`와 `matchingId`는 `authStore`에서 직접 읽는다.

```typescript
useCareChat(): {
  connected: boolean
  messages: ChatMessage[]     // care 전용 타입
  sendMessage: (content: string) => void
}
```

**STOMP → Care 타입 변환:**

```typescript
StompChatInbound → ChatMessage
// id: String(messageId) — ERD message.id 를 문자열로 변환
// senderId: String(senderId) — Care 타입이 string 이므로 변환
// senderRole: 'PATIENT' → 'patient', 'GUARDIAN' → 'care'
// sentAt: createdAt — ERD message.created_at (ISO 8601)
```

**수신 분기:**

- `CHAT` → `ChatMessage` 로 변환하여 messages 배열에 추가
- `CALL_CONFIRMED` → `notificationStore.showNotification()` 위임

**발행:**

- `contentType: 'TEXT'` 고정. `phraseId` / `exprId` 를 보내지 않는다.
- 따라서 서버 사이드에서 `usage_log` 에 기록되지 않는다.

**기존 코드 호환:** `useChatSocket.ts` 를 호환 래퍼로 유지하여 `ChatPage` 의 기존 import 를 깨뜨리지 않는다. 마이그레이션 완료 후 삭제할 것.

### 3.6 `hooks/usePatientStomp.ts` — 환자 어댑터

환자 앱 전체 생명주기에 걸쳐 WS 를 유지하는 어댑터 훅이다. `userId`와 `matchingId`는 `authStore`에서 직접 읽으며, 콜백만 파라미터로 받는다.

```typescript
usePatientStomp(callbacks?: PatientStompCallbacks): {
  status: StompConnectionStatus
  connected: boolean
  sendChat: (params: { text, contentType, phraseId?, exprId? }) => void
  sendCall: (callType: StompCallType) => void
}
```

**콜백 기반 설계:**

콜백은 `useRef`로 내부에서 안정화하므로, 호출 측에서 매 렌더마다 새 객체를 전달해도 구독이 재생성되지 않는다.

보호자 어댑터는 내부에 `useState` 로 messages 를 관리하지만, 환자 어댑터는 **콜백으로 외부에 위임**한다. 이유는:

1. 환자 쪽 메시지 상태는 이미 `usePatientIncomingChat` 의 `useReducer` 가 관리한다 (968줄 분량의 복잡한 상태 머신).
2. 이 상태 머신에 중복으로 `useState` 를 두면 상태 불일치가 발생한다.
3. `onChatMessage` 콜백으로 `StompChatInbound` 를 그대로 전달하면, `PatientIncomingChatProvider` 에서 기존 dispatch 흐름에 자연스럽게 연결할 수 있다.

**연결점 (향후 작업):**

현재 `usePatientIncomingChat` 의 `triggerIncomingPreset()` 이 mock 메시지를 만들어 dispatch 하고 있다. 실제 연동 시:

```
// PatientLayout 또는 PatientIncomingChatProvider 내부에서:
// matchingId / userId 는 authStore 에서 자동으로 읽으므로 전달 불필요
usePatientStomp({
  onChatMessage: (payload) => {
    // StompChatInbound → PatientChatMessage 변환
    // dispatch({ type: 'RECORD_RECEIVED_MESSAGE', ... })
  },
  onCallConfirmed: (payload) => {
    // 환자 화면 피드백 처리 (모달 vs 토스트 — BE 미확정)
  },
})
```

**발행과 usage_log 의 관계:**

이 부분이 보호자와 가장 크게 다른 핵심이다.

```
환자가 PHRASE "물을 마시고 싶어요" (phraseId=8) 를 선택해서 보호자에게 보낼 때:

sendChat({
  text: '물을 마시고 싶어요',
  contentType: 'PHRASE',
  phraseId: 8,          ← 이 값이 서버로 전달됨
})

서버 처리 (트랜잭션):
1. message 테이블 INSERT → { content_type: 'PHRASE', phrase_id: 8, ... }
2. usage_log 테이블 INSERT → { phrase_id: 8, time_slot_id: (서버 계산), ... }
```

보호자는 `contentType: 'TEXT'` 만 보내고 `phraseId` / `exprId` 를 포함하지 않으므로, 서버는 usage_log 를 남기지 않는다.

---

## 4. ERD 연동 상세

### message 테이블과 STOMP 의 관계

```
[환자/보호자] → STOMP /app/chat → [서버] → message INSERT → STOMP /user/queue/chat → [상대방]

StompPublishChat          →  message 테이블
  .matchingId             →  matching.id (bigint → number)  ← AuthSession.matchingId
  .senderId               →  user.id (bigint → number)     ← AuthSession.userId
  .text                   →  message.content
  .contentType            →  message.content_type
  .senderRole             →  message.sender_role
  .phraseId               →  message.phrase_id    (NULL if TEXT)
  .exprId                 →  message.expr_id      (NULL if TEXT/PHRASE)

StompChatInbound          ←  message 테이블 (INSERT 결과)
  .matchingId             ←  matching.id
  .messageId              ←  message.id
  .senderId               ←  user.id
  .text                   ←  message.content
  .contentType            ←  message.content_type
  .senderRole             ←  message.sender_role
  .phraseId               ←  message.phrase_id
  .exprId                 ←  message.expr_id
  .isRead                 ←  message.is_read (초기 false)
  .createdAt              ←  message.created_at (ISO 8601)
```

### usage_log 테이블과 STOMP 의 관계

```
usage_log 은 환자가 표현을 "사용"할 때만 기록된다.
보호자의 TEXT 메시지는 usage_log 와 무관하다.

[환자 발행] StompPublishChat (contentType: PHRASE, phraseId: 8)
  → 서버 트랜잭션:
    1) message INSERT  { phrase_id: 8 }
    2) usage_log INSERT { phrase_id: 8, time_slot_id: (used_at 기준 계산) }

[환자 발행] StompPublishChat (contentType: EXPRESSION, exprId: 3)
  → 서버 트랜잭션:
    1) message INSERT  { expr_id: 3 }
    2) usage_log INSERT { expr_id: 3, time_slot_id: (used_at 기준 계산) }
    3) expressions UPDATE { last_used: now() }

[보호자 발행] StompPublishChat (contentType: TEXT)
  → 서버: message INSERT 만. usage_log 기록 없음.
```

### call 테이블과 STOMP 의 관계

```
[환자] → STOMP /app/call (type: CALL | SOS) → [서버] → call INSERT → FCM → [보호자]
[보호자] → REST POST /api/calls/{callId}/confirm → [서버] → call UPDATE(status: RECEIVED) → STOMP CALL_CONFIRMED → [환자]
```

---

## 5. 설치 및 환경 설정

### 패키지 설치

```bash
cd frontend
npm install @stomp/stompjs
```

SockJS 는 설치하지 않는다. Capacitor Android + 현대 브라우저 모두 네이티브 WebSocket 을 지원한다.

### 환경 변수 (.env)

```env
# WebSocket 서버 주소 (미설정 시 현재 호스트 사용)
VITE_WS_BASE_URL=wss://api.eyespeak.com

# STOMP 엔드포인트 경로 (기본: /ws)
VITE_WS_ENDPOINT=/ws

# WS 인증 방식 (기본: both — BE 확정 후 변경)
VITE_WS_AUTH_MODE=both
```

---

## 6. BE 미확정 사항 & 대응 전략

| # | 미확정 항목 | 현재 대응 | 확정 후 조치 |
|---|-----------|----------|------------|
| 1 | WS 인증 방식 (Header vs Query Param) | `authMode: 'both'` 로 양쪽 전송 | `VITE_WS_AUTH_MODE` 변경 |
| 2 | 채팅 히스토리 페이징 API | WS 는 실시간 신규만 담당. REST 페이징은 `chatService.ts` 에 별도 구현 | API 확정 시 추가 |
| 3 | CALL_CONFIRMED 환자 화면 처리 (모달 vs 토스트) | `onCallConfirmed` 콜백으로 위임 | 컴포넌트 레벨에서 분기 |
| 4 | WS 단절 시 REST fallback | 자동 재연결(5초) + `status: 'error'` 노출 | fallback API 나오면 추가 |

> **해소된 항목:** STOMP CHAT 응답의 `messageId`, `contentType`, `isRead`, `createdAt` 필드는 ERD 기준으로 required 확정되었다.

---

## 7. 향후 작업 (이 PR 이후)

1. ~~`@stomp/stompjs` 설치~~ — ✅ 완료
2. ~~`matchingId` / `userId` 소스 결정~~ — ✅ 완료. BE 로그인 응답에 `userId`(DB PK, number) + `matchingId`(number|null) 추가 → `AuthSession` 에 포함 → `authStore` 에서 직접 읽음
3. **`PatientIncomingChatProvider` 에 `usePatientStomp` 연결** — mock `triggerIncomingPreset` → 실제 STOMP 수신으로 교체
4. **`ChatPage` 에서 `useCareChat()` 직접 사용** — 호환 래퍼 `useChatSocket` 제거
5. **REST 히스토리 API 연동** — 채팅 화면 초기 로드 시 최근 20건 조회
6. **stompSubscriptions.ts 삭제** — 빈 파일, stompChannels.ts 로 이동됨
7. **TypeScript strict 검증** — `tsc --noEmit` 통과 확인

---

## 8. 파일 변경 요약

### 신규 파일

| 파일 | 역할 |
|------|------|
| `services/websocket/stompTypes.ts` | STOMP 프로토콜 타입 |
| `services/websocket/stompClient.ts` | 클라이언트 팩토리 |
| `services/websocket/stompChannels.ts` | 채널 상수 + 파서/빌더 |
| `services/websocket/index.ts` | 배럴 export |
| `hooks/useStompClient.ts` | 연결 생명주기 공통 훅 |
| `features/care/chat/hooks/useCareChat.ts` | 보호자 어댑터 |
| `hooks/usePatientStomp.ts` | 환자 어댑터 |
| `frontend/docs/websocket-setup-guide.md` | 이 문서 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `types/auth.ts` | `AuthSession`/`AuthUserDto`에 `userId: number`, `matchingId: number \| null` 추가 |
| `services/authSessionMapper.ts` | 새 필드 매핑 추가 |
| `shared/stores/notificationStore.ts` | `teamCode` → `matchingId`, `callId` 추가 |
| `services/fcmService.ts` | FCM 알림에서 `matchingId`/`callId` 변환 |
| `features/care/chat/hooks/useChatSocket.ts` | 기존 스텁 → `useCareChat` 호환 래퍼로 교체 |
| `services/websocket/stompSubscriptions.ts` | 빈 파일 → 삭제 예정 안내 |
