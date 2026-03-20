# EyeSpeak 채팅 통신 구조

> 기술 스택: Spring Boot, STOMP over WebSocket, Firebase Cloud Messaging (FCM)
> 최종 수정: 2026-03-20
> 공유 대상: FE (프론트엔드) / BE (백엔드)
> 기준 ERD: `backend/docs/erd/eyespeak_erd_final.dbml` (22 테이블)

---

## 1. 전체 통신 구조 요약

| 구간 | 방식 | 비고 |
| --- | --- | --- |
| 클라이언트 → 서버 (채팅 발신) | STOMP `/app/chat` 발행 | 환자·보호자 동일 채널, 페이로드 차이 있음 |
| 클라이언트 → 서버 (호출/SOS 발신) | STOMP `/app/call` 발행 | 환자만 발행 |
| 서버 → 수신자 (CHAT) | WS 연결 중 → WebSocket / 끊김 → FCM | 연결 상태 기반 분기 (역할 무관) |
| 서버 → 수신자 (CALL/SOS) | FCM 항상 발송 | 연결 상태 무관, 무조건 FCM |
| 보호자 → 서버 (호출 확인) | REST `POST /api/calls/{callId}/confirm` | 확인 시점에 WS 연결 보장 안됨 |
| 서버 → 환자 (확인 피드백) | WS 연결 중 → WebSocket / 끊김 → FCM | CALL_CONFIRMED 타입 |

---

## 2. WebSocket 연결 범위

| | 환자 (웹) | 보호자 (앱) |
| --- | --- | --- |
| 연결 시점 | 로그인 시 | 채팅 화면 진입 시 |
| 해제 시점 | 로그아웃 / 브라우저 종료 | 채팅 화면 이탈 시 |
| 연결 범위 | 전체 화면 상시 유지 | 채팅 화면에서만 |
| WS 끊김 시 | FCM 폴백 (네트워크 순단, 브라우저 비활성 등) | FCM 폴백 |

> 환자는 기기 특성상 WS가 대부분 연결 상태이지만, 연결을 보장할 수는 없다.
> 따라서 환자·보호자 구분 없이 동일한 WS/FCM 분기 로직을 적용한다.

---

## 3. WebSocket vs FCM 발송 분기 기준

> 분기 기준은 **수신자의 역할이 아니라 WebSocket 연결 상태**이다.
> 환자든 보호자든 동일한 로직을 적용한다.

### 단일 분기 규칙

```
CALL / SOS → 무조건 FCM (연결 상태·역할 무관)

그 외 (CHAT, CALL_CONFIRMED 등)
  → 수신자의 WS 연결 확인
     연결 중 → WebSocket 전달
     끊김   → FCM 전달
```

| 메시지 타입 | WS 연결 중 | WS 끊김 |
| --- | --- | --- |
| CHAT | WebSocket 전달 | FCM 전달 |
| CALL_CONFIRMED | WebSocket 전달 | FCM 전달 |
| CALL / SOS | FCM 전달 | FCM 전달 |

> **CALL/SOS가 무조건 FCM인 이유:** 긴급 알림은 OS 레벨에서 인지시켜야 한다.
> WS 메시지는 앱 내부에서만 처리되지만, FCM data 메시지는 앱이 백그라운드/종료 상태에서도
> 풀스크린 오버레이, 긴급 알림음 등 커스텀 UI를 직접 제어할 수 있다.

---

## 4. STOMP 메시지 포맷

> **ID 타입 규칙:** ERD 의 모든 PK 는 `bigint` 이다.
> STOMP 메시지 내 ID 필드(`matchingId`, `messageId`, `phraseId`, `exprId`, `callId`)는
> **number (정수)** 로 전달한다. FE 에서 문자열로 변환이 필요하면 수신 측에서 처리한다.

### 4.1 STOMP 채널

| 채널 | 방향 | 용도 |
| --- | --- | --- |
| `/app/chat` | 발행 (클라이언트 → 서버) | 채팅 메시지 전송 |
| `/app/call` | 발행 (클라이언트 → 서버) | 호출/SOS 전송 |
| `/user/queue/chat` | 구독 (서버 → 클라이언트) | CHAT + CALL_CONFIRMED 수신 |

### 4.2 채팅 발행 — 클라이언트 → 서버 (`/app/chat`)

환자와 보호자가 동일한 채널을 사용하지만, 포함하는 필드가 다르다.

```json
{
  "type": "CHAT",
  "matchingId": 1,
  "senderId": 1,
  "senderRole": "PATIENT | GUARDIAN",
  "contentType": "TEXT | PHRASE | EXPRESSION",
  "text": "메시지 내용",
  "phraseId": null,
  "exprId": null
}
```

| 필드 | 타입 | 필수 | ERD 매핑 | 설명 |
| --- | --- | --- | --- | --- |
| type | string | O | — | 고정값 `"CHAT"` |
| matchingId | number | O | `matching.id` | 매칭 ID (환자-보호자 쌍 식별) |
| senderId | number | O | `user.id` | 발신자 유저 ID |
| senderRole | string | O | `message.sender_role` (= `role` enum) | `"PATIENT"` 또는 `"GUARDIAN"` |
| contentType | string | O | `message.content_type` (= `content_type` enum) | `"TEXT"` / `"PHRASE"` / `"EXPRESSION"` |
| text | string | O | `message.content` | 메시지 본문 |
| phraseId | number \| null | — | `message.phrase_id` → `phrase.id` FK | contentType=`PHRASE` 일 때만 값 존재 |
| exprId | number \| null | — | `message.expr_id` → `expressions.id` FK | contentType=`EXPRESSION` 일 때만 값 존재 |

**역할별 사용 패턴:**

| 발신자 | contentType | phraseId | exprId | 서버 사이드 이펙트 |
| --- | --- | --- | --- | --- |
| 보호자 | `TEXT` 만 사용 | 항상 null | 항상 null | `message` INSERT 만 |
| 환자 | `TEXT` | null | null | `message` INSERT + `usage_log` INSERT (content 필드 사용) |
| 환자 | `PHRASE` | 필수 (phrase.id) | null | `message` INSERT + `usage_log` INSERT (phrase_id 사용) |
| 환자 | `EXPRESSION` | null | 필수 (expressions.id) | `message` INSERT + `usage_log` INSERT (expr_id 사용) + `expressions.last_used` UPDATE |

> **usage_log 기록 규칙:**
> - 환자가 보내는 모든 채팅 메시지는 `usage_log` 에 기록된다.
> - 보호자가 보내는 메시지는 `usage_log` 에 기록되지 않는다.
> - `usage_log.time_slot_id` 는 서버가 `used_at` 시각 기준으로 `time_slot` 테이블에서 계산한다.
> - `usage_log.mood_type` / `mood_level` 은 해당 시점의 `daily_mood` 에서 참조하거나 NULL.

### 4.3 채팅 수신 — 서버 → 클라이언트 (`/user/queue/chat`, type=CHAT)

서버가 `message` 테이블에 INSERT 한 뒤, 상대방의 `/user/queue/chat` 으로 전달하는 포맷.

```json
{
  "type": "CHAT",
  "matchingId": 1,
  "messageId": 7,
  "senderId": 2,
  "senderRole": "PATIENT",
  "contentType": "PHRASE",
  "text": "물을 마시고 싶어요",
  "phraseId": 8,
  "exprId": null,
  "isRead": false,
  "createdAt": "2026-03-18T09:00:00"
}
```

| 필드 | 타입 | 필수 | ERD 매핑 | 설명 |
| --- | --- | --- | --- | --- |
| type | string | O | — | 고정값 `"CHAT"` |
| matchingId | number | O | `message.matching_id` | 매칭 ID |
| messageId | number | O | `message.id` | 메시지 PK (클라이언트에서 중복 방지용) |
| senderId | number | O | 발신자 `user.id` | 발신자 유저 ID |
| senderRole | string | O | `message.sender_role` | `"PATIENT"` 또는 `"GUARDIAN"` |
| contentType | string | O | `message.content_type` | `"TEXT"` / `"PHRASE"` / `"EXPRESSION"` |
| text | string | O | `message.content` | 메시지 본문 |
| phraseId | number \| null | — | `message.phrase_id` | PHRASE 타입일 때만 값 존재 |
| exprId | number \| null | — | `message.expr_id` | EXPRESSION 타입일 때만 값 존재 |
| isRead | boolean | O | `message.is_read` | 초기값 항상 `false` |
| createdAt | string | O | `message.created_at` | ISO 8601 |

### 4.4 호출 발행 — 클라이언트 → 서버 (`/app/call`)

```json
{
  "type": "CALL",
  "matchingId": 1,
  "senderId": 2,
  "senderRole": "PATIENT"
}
```

| 필드 | 타입 | 필수 | ERD 매핑 | 설명 |
| --- | --- | --- | --- | --- |
| type | string | O | — | `"CALL"` 또는 `"SOS"` |
| matchingId | number | O | `call.matching_id` | 매칭 ID |
| senderId | number | O | 발신자 `user.id` | 환자 유저 ID |
| senderRole | string | O | — | 고정값 `"PATIENT"` (호출은 환자만 가능) |

**서버 처리:**

1. `call` 테이블 INSERT — `{ matching_id, type: NORMAL|SOS, status: PENDING }`
2. STOMP type `"CALL"` → ERD call_type `NORMAL`, STOMP type `"SOS"` → ERD call_type `SOS`
3. FCM 으로 보호자에게 무조건 알림 발송

### 4.5 호출 확인 피드백 — 서버 → 환자 (`/user/queue/chat`, type=CALL_CONFIRMED)

보호자가 REST `POST /api/calls/{callId}/confirm` 호출 시 서버가 환자에게 전달.

```json
{
  "type": "CALL_CONFIRMED",
  "matchingId": 1,
  "senderId": 1,
  "senderRole": "GUARDIAN",
  "body": "보호자가 알림을 확인하였습니다",
  "callId": 6,
  "callType": "SOS",
  "createdAt": "2026-03-19T10:00:05"
}
```

| 필드 | 타입 | 필수 | ERD 매핑 | 설명 |
| --- | --- | --- | --- | --- |
| type | string | O | — | 고정값 `"CALL_CONFIRMED"` |
| matchingId | number | O | `call.matching_id` | 매칭 ID |
| senderId | number | O | 보호자 `user.id` | 확인한 보호자 유저 ID |
| senderRole | string | O | — | 고정값 `"GUARDIAN"` |
| body | string | O | — | 확인 메시지 본문 |
| callId | number | O | `call.id` | 확인된 호출 PK |
| callType | string | O | `call.type` | `"NORMAL"` 또는 `"SOS"` (ERD call_type enum 그대로) |
| createdAt | string | O | — | 확인 시각 ISO 8601 |

**서버 처리:**

1. `call` 테이블 UPDATE — `status: PENDING → RECEIVED`
2. 환자에게 WS 또는 FCM 으로 CALL_CONFIRMED 전달

---

## 5. 서버 사이드 처리 흐름 (ERD 기준)

### 5.1 채팅 메시지 수신 시 서버 처리

```
클라이언트 → STOMP /app/chat → 서버

[1단계: message 테이블 INSERT]
  message {
    matching_id:  payload.matchingId
    sender_role:  payload.senderRole
    content_type: payload.contentType
    content:      payload.text
    phrase_id:    payload.phraseId    (null if TEXT/EXPRESSION)
    expr_id:      payload.exprId      (null if TEXT/PHRASE)
    is_read:      false
    created_at:   now()
  }

[2단계: 환자 발신인 경우에만 — usage_log INSERT]
  if (senderRole === 'PATIENT') {
    usage_log {
      matching_id:  payload.matchingId
      phrase_id:    payload.phraseId    (null if TEXT/EXPRESSION)
      expr_id:      payload.exprId      (null if TEXT/PHRASE)
      content:      payload.text        (TEXT 타입이고 phraseId/exprId 둘 다 null 일 때)
      time_slot_id: (서버가 now() 기준 time_slot 에서 조회)
      mood_type:    (daily_mood 참조 또는 null)
      mood_level:   (daily_mood 참조 또는 null)
      used_at:      now()
    }
  }

[3단계: EXPRESSION 타입인 경우 — expressions.last_used UPDATE]
  if (contentType === 'EXPRESSION' && exprId != null) {
    UPDATE expressions SET last_used = now() WHERE id = exprId
  }

[4단계: 상대방에게 전달]
  → 수신자 WS 연결 중: /user/queue/chat 으로 STOMP CHAT 전달
  → 수신자 WS 끊김:    FCM data 메시지 전달
```

### 5.2 호출 수신 시 서버 처리

```
클라이언트 → STOMP /app/call → 서버

[1단계: call 테이블 INSERT]
  call {
    matching_id: payload.matchingId
    type:        NORMAL (if payload.type === 'CALL') | SOS (if payload.type === 'SOS')
    status:      PENDING
    created_at:  now()
  }

[2단계: 보호자에게 FCM 발송 (무조건)]
  FCM data 메시지 → 보호자 fcm_token

[3단계: 보호자 확인 시]
  REST POST /api/calls/{callId}/confirm
  → call UPDATE: status = RECEIVED
  → 환자에게 CALL_CONFIRMED 전달 (WS 또는 FCM)
```

---

## 6. 채팅 히스토리 REST API

> 설계 중 — 아래는 FE/BE 합의용 초안

### 메시지 목록 조회 (페이징)

```
GET /api/messages?matchingId={matchingId}&cursor={messageId}&size=20
Authorization: Bearer {JWT}
```

- `cursor`: 마지막으로 받은 `message.id`. 첫 요청 시 생략 → 최신 20건 반환
- `size`: 페이지 크기 (기본 20)
- 정렬: `created_at DESC`

### 읽음 처리

```
PATCH /api/messages/{messageId}/read
Authorization: Bearer {JWT}
```

- `message.is_read` → `true` 로 UPDATE

---

## 7. FCM Payload 명세

> data-only 메시지로 통일 (notification 필드 미사용)
> 이유: SOS 긴급 호출 시 풀스크린 오버레이 등 커스텀 UI를 앱에서 직접 제어하기 위해

### 공통 필드

| 필드 | 타입 | 필수 | ERD 매핑 | 설명 |
| --- | --- | --- | --- | --- |
| type | string | O | — | `CALL` / `SOS` / `CHAT` / `VOICE_READY` / `CALL_CONFIRMED` |
| matchingId | string | O | `matching.id` | 매칭 ID (FCM 은 문자열만 지원) |
| senderId | string | O | `user.id` | 발신자 유저 ID |
| senderRole | string | O | `role` enum | `PATIENT` / `GUARDIAN` |
| title | string | O | — | 알림 제목 |
| body | string | O | — | 알림 본문 |
| timestamp | string | O | — | ISO 8601 |

### type별 추가 필드

| 필드 | 타입 | 사용 type | ERD 매핑 | 설명 |
| --- | --- | --- | --- | --- |
| callId | string | CALL, SOS, CALL_CONFIRMED | `call.id` | 호출 PK |
| callType | string | CALL_CONFIRMED | `call.type` | `NORMAL` / `SOS` |
| messageId | string | CHAT | `message.id` | 메시지 PK |
| contentType | string | CHAT | `message.content_type` | `TEXT` / `PHRASE` / `EXPRESSION` |

> FCM data 메시지는 모든 값이 string 이므로, number 타입 ID 도 문자열로 변환하여 전달한다.
> FE 에서 필요 시 `Number()` 로 변환한다.

### Payload 예시

**CALL**
```json
{
  "type": "CALL",
  "matchingId": "1",
  "senderId": "2",
  "senderRole": "PATIENT",
  "title": "호출 알림",
  "body": "이환자님이 호출하였습니다",
  "timestamp": "2026-03-17T08:00:00",
  "callId": "1"
}
```

**SOS**
```json
{
  "type": "SOS",
  "matchingId": "1",
  "senderId": "2",
  "senderRole": "PATIENT",
  "title": "SOS 긴급 알림",
  "body": "이환자님이 SOS 호출하였습니다",
  "timestamp": "2026-03-17T23:30:00",
  "callId": "3"
}
```

**CHAT**
```json
{
  "type": "CHAT",
  "matchingId": "1",
  "senderId": "2",
  "senderRole": "PATIENT",
  "title": "이환자님",
  "body": "물을 마시고 싶어요",
  "timestamp": "2026-03-18T09:00:00",
  "messageId": "1",
  "contentType": "PHRASE"
}
```

**VOICE_READY**
```json
{
  "type": "VOICE_READY",
  "matchingId": "1",
  "senderId": "0",
  "senderRole": "PATIENT",
  "title": "음성 학습 완료",
  "body": "TTS 음성이 준비되었습니다",
  "timestamp": "2026-03-01T10:00:00"
}
```

**CALL_CONFIRMED** (FCM 폴백 — WS 끊김 시)
```json
{
  "type": "CALL_CONFIRMED",
  "matchingId": "1",
  "senderId": "1",
  "senderRole": "GUARDIAN",
  "title": "호출 확인",
  "body": "보호자가 알림을 확인하였습니다",
  "timestamp": "2026-03-19T10:00:05",
  "callId": "6",
  "callType": "SOS"
}
```

---

## 8. FCM 토큰 관리 API

### 토큰 등록/갱신

```
POST /api/fcm/token
Authorization: Bearer {JWT}
Content-Type: application/json
```

```json
{
  "token": "FCM_TOKEN",
  "deviceType": "ANDROID"
}
```

- 서버는 JWT에서 `user.id` 추출 → role 에 따라 `guardian.fcm_token` 또는 `patient.fcm_token` 업데이트
- 같은 사용자 ID로 이미 토큰이 있으면 upsert (교체)
- 응답: `200 OK`

### 토큰 삭제 (로그아웃)

```
DELETE /api/fcm/token
Authorization: Bearer {JWT}
```

- 서버: `guardian.fcm_token` 또는 `patient.fcm_token` → NULL 으로 UPDATE
- 응답: `200 OK`

### 토큰 API 호출 시점

| 시점 | API |
| --- | --- |
| 로그인 성공 직후 | POST (항상 호출) |
| 앱 재실행 시 | POST (토큰 변경된 경우) |
| 로그아웃 시 | DELETE (항상 호출) |

---

## 9. 호출 확인 API

```
POST /api/calls/{callId}/confirm
Authorization: Bearer {JWT}  ← 보호자 토큰
```

| 파라미터 | 타입 | ERD 매핑 | 설명 |
| --- | --- | --- | --- |
| callId (path) | number | `call.id` | 확인할 호출 PK |

- 응답: `200 OK`
- 서버 처리:
  1. `call` 테이블 UPDATE: `status = RECEIVED`
  2. `call.matching_id` 로 환자 조회
  3. 환자에게 CALL_CONFIRMED 전달 (WS 연결 중 → WebSocket / 끊김 → FCM)

---

## 10. 보호자 앱 FCM 수신 동작 분기

| type | 포그라운드 | 백그라운드/종료 | 알림 탭 동작 | 알림음 |
| --- | --- | --- | --- | --- |
| CALL | 인앱 배너 | OS 알림 | 환자 상태 화면 + 확인 버튼 | 기본 |
| SOS | 풀스크린 오버레이 | OS 알림 | 환자 상태 화면 + 확인 버튼 | 긴급 |
| CHAT | 채팅 미리보기 배너 | OS 알림 | 채팅 화면 | 기본 |
| VOICE_READY | 토스트 | OS 알림 | TTS 설정 화면 | 기본 |

---

## 11. 환자 웹 수신 동작 분기

### WebSocket 수신 시 (WS 연결 중)

| type | 대화하기 화면 | 다른 화면 |
| --- | --- | --- |
| CHAT | 채팅창에 바로 표시 (인라인) | 인터럽트 오버레이 → 응답/나중에 선택 |
| CALL_CONFIRMED | 채팅창에 피드백 표시 | 토스트 또는 모달로 표시 (미확정) |

### FCM 수신 시 (WS 끊김 — 네트워크 순단, 브라우저 비활성 등)

| type | 처리 |
| --- | --- |
| CHAT | Service Worker → 브라우저 알림 표시 |
| CALL_CONFIRMED | Service Worker → 브라우저 알림 표시 |

> 환자 웹에서 FCM을 수신하려면 Firebase JS SDK + Service Worker 등록이 필요하다.
> 정상 상태에서는 WS 경로를 타지만, 연결 예외 상황의 안전망으로 FCM 폴백을 둔다.

---

## 12. ERD 매핑 참조표

| STOMP 필드 | ERD 테이블.컬럼 | 타입 | 비고 |
| --- | --- | --- | --- |
| matchingId | `matching.id` | bigint | 환자-보호자 쌍 식별 |
| senderId | `user.id` | bigint | 발신자 유저 ID |
| senderRole | `message.sender_role` / `role` enum | enum | `PATIENT` / `GUARDIAN` |
| contentType | `message.content_type` / `content_type` enum | enum | `TEXT` / `PHRASE` / `EXPRESSION` |
| text | `message.content` | text | 메시지 본문 |
| messageId | `message.id` | bigint | 메시지 PK |
| phraseId | `message.phrase_id` → `phrase.id` FK | bigint | 시드 표현 선택 시 |
| exprId | `message.expr_id` → `expressions.id` FK | bigint | 맞춤 표현 선택 시 |
| isRead | `message.is_read` | boolean | 읽음 여부 |
| callId | `call.id` | bigint | 호출 PK |
| callType | `call.type` / `call_type` enum | enum | `NORMAL` / `SOS` |
| createdAt | `message.created_at` / `call.created_at` | datetime | 생성 시각 |

---

## 13. FE ↔ BE 협의 필요 리스트

- [x] 로그인 API 응답에 `userId`(DB PK, number) + `matchingId`(number|null) 추가 — **BE 확인 완료**
- [x] STOMP `senderId` 로 `user.id`(DB PK, bigint) 사용 — **확정**
- [ ] WebSocket 인증 방식 확정: Header(Bearer) vs Query Param
- [ ] 채팅 히스토리 조회 API 확정 (섹션 6 초안 기반)
- [ ] 읽음 처리 API 확정 (PATCH vs PUT, 단건 vs 다건)
- [ ] CALL_CONFIRMED 수신 시 환자 화면 처리 방식 확정 (모달 vs 토스트)
- [ ] 환자 웹 FCM 수신 구현 범위 확정 (Service Worker 등록, 브라우저 알림 권한)
- [ ] 반복 알림 기능 필요 여부 (보호자 확인 전까지 재전송)
- [ ] VOICE_READY 발송 주체: TTS 서버 → Spring → FCM 흐름에서 senderId 처리 방식
- [ ] usage_log 의 mood_type/mood_level 결정 주체 (서버 자동 vs 클라이언트 전달)
