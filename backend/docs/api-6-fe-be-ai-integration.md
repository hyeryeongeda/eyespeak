# API 6번: 웹소켓 채팅 + 추천 로직 연동 가이드

**전제: `ai-server-rest-migration.md`의 REST 전환이 완료된 상태 기준.**
- AI 서버는 DB 직접 접근 안 함 (pymysql 제거됨)
- AI 서버는 BE API를 통해 데이터 조회 (`/ai/user-context`, `/ai/general-corpus`)
- `/expressions/classify`는 분류만 반환, DB 저장은 BE가 직접 함

---

## 현재 코드 상태 (FE / BE / AI)

### FE 상태

#### 1. 보호자 메시지 수신 → 추천 문장 표시 (동작함, but mock)

```
보호자가 메시지 보냄
  → 환자 FE가 웹소켓으로 수신 (usePatientStomp.ts)
  → handleStompChat() 실행 (usePatientIncomingChat.tsx)
  → 보호자 메시지면 reply mode 진입
  → fetchSuggestedReplies() 호출 (recommendationService.ts)
  → POST /recommendations/replies 호출 (recommendationApi.ts)
  → 추천 문장 3개 화면에 표시
```

**상태:** 코드 완성됨. 근데 `VITE_AI_API_MODE=mock`이라 **가짜 데이터** 반환 중.

#### 2. 환자가 추천 문장 선택 → 메시지 전송 (깨져있음)

```
환자가 추천 문장 "물 좀 줘" 선택
  → sendSuggestedReply() (usePatientIncomingChat.tsx 870줄)
  → sendPatientReply() (recommendationService.ts 287줄)
  → sendRecommendationApi() (recommendationApi.ts 75줄)
  → POST /recommendations/send ← BE에 이 엔드포인트가 없음! 404!
```

**상태:** FE 코드는 있는데 **BE 엔드포인트가 없어서 404**. REST로 보내고 있음 (웹소켓 아님).

#### 3. 맞춤대화에서 문장 선택 → 메시지 전송 (깨져있음)

```
환자가 맞춤대화에서 "배고파" 선택
  → submitCustomTalkUtterance() (customTalkStore.ts)
  → sendRecommendationApi()
  → POST /recommendations/send ← 마찬가지로 404!
```

**상태:** 위와 동일.

#### 4. FE 환경변수

```
dev:  VITE_API_MODE=real         ← 웹소켓 채팅 동작 중
      VITE_AI_API_MODE=mock      ← AI 추천 가짜 데이터
```

### BE 상태 (REST 전환 후 기준)

#### 1. 웹소켓 채팅 (동작함)

```
환자/보호자 → STOMP /app/chat → ChatController → ChatService.sendMessage()
  → message 테이블 저장
  → 상대방에게 웹소켓 전송 (온라인) / FCM (오프라인)
```

**상태:** 정상 동작. **AI classify 호출 + 학습 데이터 저장은 아직 없음.**

#### 2. 추천 API 5개 (동작함)

| 엔드포인트 | AI 서버 호출 | 상태 |
|---|---|---|
| `GET /recommendations/categories` | BE가 직접 힌트 조회 + AI에 추천 요청 | O |
| `POST /recommendations/sentences` | `/recommend/category` | O |
| `POST /recommendations/replies` | `/recommend/replies` | O |
| `POST /recommendations/words` | `/words` | O |
| `POST /recommendations/compose` | `/generate` | O |

#### 3. AI 데이터 제공 API (REST 전환으로 새로 생김)

| 엔드포인트 | 용도 | 상태 |
|---|---|---|
| `GET /ai/user-context/{matchingId}` | AI에 환자 데이터 제공 | O (REST 전환으로 생김) |
| `GET /ai/general-corpus` | AI에 말뭉치 제공 | O (REST 전환으로 생김) |

#### 4. `/recommendations/send` (미구현)

주석에만 있고 실제 코드 없음.

### AI 상태 (REST 전환 후 기준)

#### 1. 추천 엔드포인트 (동작함)

| AI 엔드포인트 | 하는 일 | DB 접근 |
|---|---|---|
| `/recommend/category` | 카테고리별 추천 문장 | BE API 경유 |
| `/recommend/replies` | 보호자 메시지 답변 추천 | BE API 경유 |
| `/words` | 단어 추천 | BE API 경유 |
| `/generate` | 단어 조합 → 문장 생성 | BE API 경유 |
| `/expressions/classify` | 감정/의도 분류 + 키워드 추출 | **DB 접근 없음** (분류만) |

#### 2. 삭제된 것

- `/expressions/use` → `/expressions/classify`로 대체
- `/recommend/hints` → BE가 직접 처리
- pymysql, DB_CONFIG, get_db() 삭제됨

---

## 해결해야 할 문제 3개

### 문제 1. FE가 `/recommendations/send`로 보내는데 BE에 없음

환자가 추천 문장 선택하면 FE가 REST로 `/recommendations/send`를 호출하는데, BE에 이 엔드포인트가 없어서 404.

### 문제 2. AI 추천이 mock 모드

`VITE_AI_API_MODE=mock`이라 추천 문장이 가짜 데이터. real로 바꿔야 진짜 AI 추천 동작.

### 문제 3. 학습 데이터가 안 쌓임

환자가 메시지를 보내도 expressions/usage_log에 기록이 안 됨. ChatService에서 AI classify 호출이 없어서.

---

## 해결 방안

### 방향 A: 웹소켓 기반 (추천)

FE가 `/recommendations/send` REST 호출하는 걸 **기존 웹소켓 `sendChat()`으로 바꿈.**
`/recommendations/send` 별도 구현 불필요.

#### 전체 흐름 (완성 시)

```
[보호자 → 환자 추천]
1. 보호자가 웹소켓으로 메시지 전송
2. BE ChatService → message 저장 + 환자에게 웹소켓 전송
3. 환자 FE가 메시지 수신 → reply mode 진입
4. FE → BE POST /recommendations/replies 호출
5. BE → AI /recommend/replies 호출
6. AI → BE /ai/user-context/{matchingId} 호출 (환자 데이터 조회)
7. BE → AI에 환자 데이터 반환
8. AI가 추천 문장 3개 생성 → BE → FE 반환
9. 환자 화면에 추천 문장 3개 표시

[환자 → 보호자 발화 + 학습 데이터 저장]
10. 환자가 추천 문장 선택 (or 키보드 입력, 단어 조합, 맞춤대화 등 모든 경우)
11. FE → 웹소켓 /app/chat으로 메시지 전송
12. BE ChatService → message 저장 + 보호자에게 웹소켓 전송
13. BE ChatService → AI /expressions/classify 호출 (text 넘김)
14. AI가 감정/의도 분류 + 키워드 추출 → BE에 반환
15. BE가 직접 expressions + usage_log + keywords DB 저장 (학습 데이터)
```

**6~7번이 REST 전환으로 달라진 부분:** AI가 DB 직접 조회 대신 BE API로 데이터 가져옴.
**15번이 REST 전환으로 달라진 부분:** BE가 직접 DB 저장 (AI가 저장 요청 안 함).

#### FE 맞출 부분

**1. 메시지 전송 방식 변경 — REST → 웹소켓**

```
Before: sendRecommendationApi() → REST POST /recommendations/send (404)
After:  usePatientStomp.sendChat(text, 'TEXT') → 웹소켓 /app/chat (동작함)
```

관련 파일:
- `frontend/src/hooks/usePatientIncomingChat.tsx` — sendSuggestedReply(), sendManualReply()
- `frontend/src/services/recommendationService.ts` — sendPatientReply()
- `frontend/src/features/patient/custom-talk/store/customTalkStore.ts` — submitCustomTalkUtterance()

**2. AI API 모드 변경**

```
VITE_AI_API_MODE=mock → real
```

관련 파일:
- `frontend/docker-compose.dev.yml`
- `frontend/src/services/aiServiceConfig.ts`

#### BE 맞출 부분

**1. ChatService에 AI classify 호출 + 학습 데이터 저장**

REST 전환 후이므로 BE가 직접 DB 저장.

```java
// ChatService.sendMessage() 안에 추가:
if (senderRole == Role.PATIENT) {
    try {
        // 1. AI에 분류 요청
        Map result = restTemplate.postForObject(
            aiServerUrl + "/expressions/classify",
            Map.of("text", messageText), Map.class);

        String sentiment = (String) result.get("sentiment");
        String category = (String) result.get("category");
        List<String> keywords = (List<String>) result.get("keywords");

        // 2. BE가 직접 DB 저장 (REST 전환 후이므로)
        // expressions 저장 (있으면 last_used 업데이트, 없으면 INSERT)
        // expression_keywords 저장 (새 표현일 때)
        // usage_log 저장 (time_slot_id 자동 계산)
    } catch (Exception e) {
        log.warn("AI 분류 실패: {}", e.getMessage());
        // 실패해도 메시지 전송에 영향 없음
    }
}
```

관련 파일:
- `backend/.../chat/service/ChatService.java`

**2. `/recommendations/send` 엔드포인트는 만들지 않음** — 웹소켓으로 대체

#### AI 맞출 부분

**REST 전환에서 이미 완료됨!** 추가 작업 없음.
- `/expressions/classify` — REST 전환에서 이미 변경
- DB 접근 없음 — REST 전환에서 이미 제거

---

### 방향 B: REST 기반

BE에 `POST /recommendations/send`를 새로 만들어서 FE 코드 안 바꿈.

#### FE 맞출 부분
- 코드 수정 없음
- `VITE_AI_API_MODE=real` 변경만

#### BE 맞출 부분
- `RecommendationController`에 `@PostMapping("/send")` 추가
- FE 타입에 맞춰서 받기: `{ text, source, replyToId }`
- message 저장 + 웹소켓 전송 + AI classify + DB 저장

#### AI 맞출 부분
- REST 전환에서 이미 완료

---

## 추천: 방향 A

이유:
1. FE가 이미 웹소켓 `sendChat()` 코드가 있음
2. BE에 새 엔드포인트 안 만들어도 됨
3. ChatService에 classify 호출만 추가하면 끝
4. FE 타입 불일치 문제 자체가 사라짐

**FE 담당자랑 "추천 문장 선택 시 REST `/send` 대신 웹소켓 `sendChat()` 쓰는 걸로 바꿔달라"고 협의 필요.**

---

## 체크리스트

### 전제조건
- [ ] `ai-server-rest-migration.md` REST 전환 완료

### FE 담당자
- [ ] `sendSuggestedReply()`에서 `sendRecommendationApi()` → `sendChat()` (웹소켓)으로 변경
- [ ] `sendManualReply()`에서 동일하게 변경
- [ ] `submitCustomTalkUtterance()`에서 동일하게 변경
- [ ] `VITE_AI_API_MODE=mock` → `real` 변경

### BE 담당자
- [ ] ChatService.sendMessage()에 AI `/expressions/classify` 호출 추가
- [ ] 분류 결과로 expressions + usage_log + keywords BE가 직접 DB 저장
- [ ] try-catch로 AI 실패 시 메시지 전송에 영향 없도록

### AI 담당자 (예린)
- [ ] REST 전환에서 `/expressions/classify` 이미 완료 → 추가 작업 없음
- [ ] 전체 흐름 테스트 참여

### 공통
- [ ] dev 서버에서 전체 흐름 테스트:
  - [ ] 보호자 메시지 → 환자 추천 문장 표시 확인
  - [ ] 환자 추천 문장 선택 → 보호자에게 전달 확인
  - [ ] expressions/usage_log에 학습 데이터 쌓이는지 확인
  - [ ] 맞춤대화에서 문장 선택 → 전달 + 학습 확인
