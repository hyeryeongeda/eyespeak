# 추천 API 명세 변경 기록

> FE 공유용: API 명세 점검 후 변경/추가/삭제된 내용 정리
> 최종 수정일: 2026-03-21

---

## 1. 추천 카테고리 조회

`GET /api/v1/recommendations/categories`

### 변경사항

| 항목 | 변경 전 (원본 명세) | 변경 후 | 사유 |
|---|---|---|---|
| 응답 필드명 `type` | `type` | `key` | FE 타입(`RecommendationCategoryKey`)과 일치시킴 |
| 응답 필드명 `label` | `label` | `title` | FE 타입(`RecommendationCategoryDto.title`)과 일치시킴 |
| 응답 필드 추가 | 없음 | `description` (optional) | FE에서 사용하는 부가 설명 필드 |
| 응답 필드 추가 | 없음 | `hint` (optional) | DB 조회 기반 힌트 (오늘 기분, 현재 일정, 자주 쓴 표현, 최근 사용 등) |
| 카테고리 값 형식 | 대문자 (`MOOD`) | 소문자 (`mood`) | FE 타입 `RecommendationCategoryKey = 'mood' \| 'schedule' \| 'frequent' \| 'recent'` |
| 에러 케이스 삭제 | AI-701 (AI 추천 생성 실패) | 삭제 | 고정 카테고리 목록 + DB 조회만 하므로 AI 서버 호출 없음 |

### 최종 명세

**Response (200 OK)**

```json
{
  "code": "SUCCESS",
  "message": "요청이 성공하였습니다",
  "data": {
    "categories": [
      { "key": "mood", "title": "오늘의 기분", "description": "기분 기반 추천", "hint": "기분 좋음" },
      { "key": "schedule", "title": "오늘 일정", "description": "일정 기반 추천", "hint": "아침 식사" },
      { "key": "frequent", "title": "자주 쓴 표현", "description": "자주 사용한 표현 추천", "hint": "어깨 아파" },
      { "key": "recent", "title": "직전 사용", "description": "최근 사용 표현 추천", "hint": "물 좀 줘" }
    ]
  }
}
```

**Error Cases**

| 상황 | 에러 코드 | HTTP 상태 |
|---|---|---|
| 토큰 만료 | AUTH-201 | 401 |
| 매칭 정보 없음 | MATCHING-803 | 404 |

### 흐름도 (FE → BE → AI → DB)

```
1. 환자가 맞춤대화 진입

2. FE → BE 요청
   GET /api/v1/recommendations/categories
   Headers: { Authorization: "Bearer {JWT}" }

3. BE (RecommendationController.getCategories)
   - JWT에서 userId 추출
   - userId → Guardian/Patient → Matching 조회 → matchingId 획득
   - AI 서버에 hint 요청 전달

4. BE → AI 요청
   POST http://eyespeak-ai-caregiver:5003/recommend/hints
   Body: { "matching_id": 3 }

5. AI (caregiver_server_db.py - recommend_hints)
   - daily_mood에서 오늘 기분 조회 → mood_hint (예: "기분 좋음")
   - routine_slot_tag에서 현재 시간대 활동 조회 → schedule_hint (예: "경관식/수분 섭취")
   - usage_log에서 가장 많이 쓴 표현 조회 → frequent_hint (예: "어깨 아파")
   - usage_log에서 가장 최근 사용한 표현 조회 → recent_hint (예: "물 좀 줘")

6. AI → BE 응답
   { "mood_hint": "기분 좋음", "schedule_hint": "경관식/수분 섭취",
     "frequent_hint": "어깨 아파", "recent_hint": "물 좀 줘" }

7. BE: 고정 카테고리 4개 + hint 조합

8. BE → FE 응답
   {
     "code": "SUCCESS",
     "message": "요청이 성공하였습니다",
     "data": {
       "categories": [
         { "key": "mood", "title": "오늘의 기분", "description": "기분 기반 추천", "hint": "기분 좋음" },
         { "key": "schedule", "title": "오늘 일정", "description": "일정 기반 추천", "hint": "경관식/수분 섭취" },
         { "key": "frequent", "title": "자주 쓴 표현", "description": "자주 사용한 표현 추천", "hint": "어깨 아파" },
         { "key": "recent", "title": "직전 사용", "description": "최근 사용 표현 추천", "hint": "물 좀 줘" }
       ]
     }
   }

9. FE 화면에 카테고리 카드 4개 표시 (각 카드에 hint 포함)
```

### hint 데이터 출처

| key | DB 테이블 | 조회 내용 |
|---|---|---|
| mood | `daily_mood` | 오늘 날짜의 mood_type |
| schedule | `routine_slot_tag` + `time_slot` + `activity_tag` | 현재 시간대의 활동 |
| frequent | `usage_log` + `expressions` | 가장 많이 사용한 표현 content |
| recent | `usage_log` + `expressions` | 가장 최근 사용한 표현 content |

---

## 2. 카테고리 기반 추천 문장 조회

`POST /api/v1/recommendations/sentences`

### 변경사항

| 항목 | 변경 전 (원본 명세) | 변경 후 | 사유 |
|---|---|---|---|
| 요청 필드명 `category` | `category` | `categoryKey` | FE 타입(`RecommendationSentencesRequestDto.categoryKey`)과 일치 |
| 카테고리 값 형식 | 대문자 (`MOOD`) | 소문자 (`mood`) | FE 타입 `RecommendationCategoryKey = 'mood' \| 'schedule' \| 'frequent' \| 'recent'` |
| 요청 필드 추가 | 없음 | `guardianMessage` (optional) | 보호자 메시지 맥락 전달용 (FE 타입에 존재) |
| 요청 필드 추가 | 없음 | `recentMessages` (optional) | 최근 대화 맥락 전달용 (FE 타입에 존재) |
| 응답 구조 변경 | `[{ id: Long, content: String }]` | `string[]` | AI 실시간 생성 문장에 PK 없음, FE 타입(`sentences: string[]`)에 맞춤 |

### 최종 명세

**Request Body**

```json
{
  "categoryKey": "mood",
  "guardianMessage": "오늘 기분이 어때?",
  "recentMessages": ["좋아", "배고파"]
}
```

- `categoryKey` (필수): mood / schedule / frequent / recent
- `guardianMessage` (선택): 보호자가 보낸 메시지 (없으면 null)
- `recentMessages` (선택): 최근 대화 메시지 목록 (없으면 null)

**Response (200 OK)**

```json
{
  "code": "SUCCESS",
  "message": "요청이 성공하였습니다",
  "data": {
    "sentences": ["오늘 기분이 좋아요", "조금 피곤해요", "머리가 아파요"]
  }
}
```

**Error Cases**

| 상황 | 에러 코드 | HTTP 상태 |
|---|---|---|
| categoryKey 값 없음 | COMMON-101 | 400 |
| 매칭 정보 없음 | MATCHING-803 | 404 |
| AI 추천 생성 실패 | AI-701 | 500 |
| AI 서버 타임아웃 | AI-702 | 502 |

### 흐름도 (FE → BE → AI → DB)

```
1. 환자가 "오늘의 기분" 카드 선택

2. FE → BE 요청
   POST /api/v1/recommendations/sentences
   Headers: { Authorization: "Bearer {JWT}" }
   Body: { "categoryKey": "mood" }

3. BE (RecommendationController.getSentences)
   - JWT에서 userId 추출
   - userId → Guardian/Patient → Matching 조회 → matchingId 획득
   - categoryKey 검증 (null/blank 시 COMMON-101 에러)
   - AI 서버에 요청 전달

4. BE → AI 요청
   POST http://eyespeak-ai-caregiver:5003/recommend/category
   Body: { "matching_id": 3, "recommend_type": "mood" }

5. AI (caregiver_server_db.py - recommend_by_category)
   - recommend_type 매핑 (대소문자 모두 처리: "mood"/"MOOD" → "mood")
   - _load_user_data_from_db(3) 호출
     → daily_mood에서 오늘 기분 조회 (예: "HAPPY")
     → routine_slot_tag에서 일정 조회
     → usage_log에서 자주/최근 사용 표현 조회
   - 카테고리별 분기:
     - mood: "환자의 오늘 기분은 '기분 좋음'입니다..." → context_question 생성
     - schedule: 현재 시간대 활동 기반 context_question
     - frequent: 가장 많이 쓴 표현 기반 context_question
     - recent: 최근 사용 표현 기반 context_question
   - _search_sentences_mixed()로 후보 6개 검색 (임베딩 유사도)
   - _refine_recommend()로 LLM이 3개로 정제

6. AI → BE 응답
   { "sentences": ["오늘 기분이 좋아요", "조금 피곤해요", "머리가 아파요"] }

7. BE → FE 응답
   {
     "code": "SUCCESS",
     "message": "요청이 성공하였습니다",
     "data": {
       "sentences": ["오늘 기분이 좋아요", "조금 피곤해요", "머리가 아파요"]
     }
   }

8. FE 화면에 추천 문장 3개 표시
```

---

## 3. 보호자 메시지 기반 추천 응답 조회

`POST /api/v1/recommendations/replies`

### 변경사항

| 항목 | 변경 전 (원본 명세) | 변경 후 | 사유 |
|---|---|---|---|
| 요청 필드 | `messageId: Long` | `message: String` | FE 타입에 맞춤. 웹소켓으로 이미 받은 텍스트 직접 전달 |
| 요청 필드 추가 | 없음 | `history?: [{ sender, content }]` (optional) | 대화 맥락 전달용 (FE 타입에 존재) |
| 응답 필드명 | `sentences` | `replies` | FE 타입 `RepliesResponseDto.replies`에 맞춤 |
| 응답 구조 | `[{ id: Long, content: String }]` | `[{ id: string, label: string, intentKey: string, source: string, rank: number }]` | FE 타입 `RecommendationReplyDto`에 맞춤 |
| 응답 `guardianMessage` | 있음 | 삭제 | FE가 이미 보호자 메시지를 알고 있음 |
| 에러 `COMMON-102` | 메시지를 찾을 수 없음 | 삭제 | DB 조회 안 하므로 불필요 |
| 에러 `MATCHING-801` | | `MATCHING-803` | 에러코드 수정 |

### 최종 명세

**Request Body**

```json
{
  "message": "오늘 기분은 어때?",
  "history": [
    { "sender": "guardian", "content": "밥 먹었어?" },
    { "sender": "patient", "content": "네" }
  ]
}
```

- `message` (필수): 보호자 메시지 텍스트
- `history` (선택): 최근 대화 이력 (없으면 null)

**Response (200 OK)**

```json
{
  "code": "SUCCESS",
  "message": "요청이 성공하였습니다",
  "data": {
    "replies": [
      { "id": "reply-1", "label": "좋아요", "intentKey": "감정", "source": "context", "rank": 1 },
      { "id": "reply-2", "label": "괜찮아요", "intentKey": "감정", "source": "context", "rank": 2 },
      { "id": "reply-3", "label": "조금 힘들어요", "intentKey": "감정", "source": "context", "rank": 3 }
    ]
  }
}
```

**Error Cases**

| 상황 | 에러 코드 | HTTP 상태 |
|---|---|---|
| 메시지 내용 없음 | COMMON-101 | 400 |
| 매칭 정보 없음 | MATCHING-803 | 404 |
| AI 추천 생성 실패 | AI-701 | 500 |
| AI 서버 타임아웃 | AI-702 | 502 |

### 흐름도 (FE → BE → AI → DB)

```
1. 보호자가 웹소켓으로 "오늘 기분은 어때?" 메시지 전송
2. 환자 화면에 보호자 메시지 표시 + 추천 답변 요청

3. FE → BE 요청
   POST /api/v1/recommendations/replies
   Headers: { Authorization: "Bearer {JWT}" }
   Body: { "message": "오늘 기분은 어때?", "history": [...] }

4. BE (RecommendationController.getReplies)
   - JWT에서 userId 추출
   - userId → Matching 조회 → matchingId 획득
   - message 검증 (null/blank 시 COMMON-101 에러)
   - AI 서버에 요청 전달

5. BE → AI 요청
   POST http://eyespeak-ai-caregiver:5003/recommend/replies
   Body: { "matching_id": 3, "question": "오늘 기분은 어때?", "history": [...] }

6. AI (caregiver_server_db.py - recommend_replies)
   - _load_user_data_from_db(3) 호출 → 사용자 표현/단어/기분/일정 로드
   - history가 있으면 대화 맥락 컨텍스트 구성
   - _search_sentences_mixed()로 후보 6개 검색
   - _refine_recommend()로 LLM이 3개로 정제
   - 각 문장에 _classify_sentence_keywords()로 intent 분류
   - id, label, intentKey, source, rank 메타정보 생성

7. AI → BE 응답
   { "replies": [
     { "id": "reply-1", "label": "좋아요", "intentKey": "감정", "source": "context", "rank": 1 },
     ...
   ]}

8. BE → FE 응답
   {
     "code": "SUCCESS",
     "message": "요청이 성공하였습니다",
     "data": {
       "replies": [
         { "id": "reply-1", "label": "좋아요", "intentKey": "감정", "source": "context", "rank": 1 },
         { "id": "reply-2", "label": "괜찮아요", "intentKey": "감정", "source": "context", "rank": 2 },
         { "id": "reply-3", "label": "조금 힘들어요", "intentKey": "감정", "source": "context", "rank": 3 }
       ]
     }
   }

9. FE 화면에 추천 답변 3개 표시 (source, rank 정보 활용)
```

---

## 4. 단계별 추천 단어 조회

`POST /api/v1/recommendations/words`

### 변경사항

| 항목 | 변경 전 (원본 명세) | 변경 후 | 사유 |
|---|---|---|---|
| `step` 값 형식 | 대문자 (`SUBJECT`) | 소문자 (`subject`) | FE 타입 `RecommendationComposeStep` |
| `selectedWords` | 있음 | 유지 (FE에 추가 요청) | AI 맥락 추천에 필수 |
| 요청 필드 추가 | 없음 | `categoryKey` (optional) | FE 타입에 존재 |
| 요청 필드 추가 | 없음 | `refreshCount` (optional) | FE 타입에 존재 |
| 응답 `words` 구조 | `[{ id: Long, content: String }]` | `string[]` | FE 타입 `words: string[]` |
| 에러 `MATCHING-801` | | `MATCHING-803` | 에러코드 수정 |

### FE 추가 필요 사항

`RecommendationWordsRequestDto`에 `selectedWords` 필드 추가 필요:
```typescript
selectedWords?: { subject?: string, object?: string }
```

### 최종 명세

**Request Body**

```json
{
  "step": "object",
  "categoryKey": "mood",
  "refreshCount": 0,
  "selectedWords": {
    "subject": "나"
  }
}
```

**Response (200 OK)**

```json
{
  "code": "SUCCESS",
  "message": "요청이 성공하였습니다",
  "data": {
    "step": "subject",
    "words": ["나", "머리", "배", "오늘"]
  }
}
```

**Error Cases**

| 상황 | 에러 코드 | HTTP 상태 |
|---|---|---|
| step 값 없음 | COMMON-101 | 400 |
| 매칭 정보 없음 | MATCHING-803 | 404 |
| AI 추천 생성 실패 | AI-701 | 500 |
| AI 서버 타임아웃 | AI-702 | 502 |

### BE 매핑 (FE ↔ AI 변환)

| FE step | AI category | 설명 |
|---|---|---|
| `subject` | `subjects` | 주어 |
| `object` | `objects` | 목적어 |
| `predicate` | `verbs` | 서술어 |
| `punctuation` | `punctuation` | 문장부호 |

### 흐름도 (FE → BE → AI → DB)

```
1. 환자가 단어 조합 모드 진입, 주어 단계 시작

2. FE → BE 요청
   POST /api/v1/recommendations/words
   Headers: { Authorization: "Bearer {JWT}" }
   Body: { "step": "subject" }

3. BE (RecommendationController.getWords)
   - JWT에서 userId 추출 → matchingId 조회
   - step 검증 + FE step("subject") → AI category("subjects") 변환
   - selectedWords가 있으면 AI 형식으로 변환
   - AI 서버에 요청 전달

4. BE → AI 요청
   POST http://eyespeak-ai-caregiver:5003/words
   Body: { "matching_id": 3, "category": "subjects", "question": "추천 단어 조회" }

5. AI (caregiver_server_db.py - get_words)
   - user_words 테이블에서 단어 풀 조회
   - 임베딩 유사도 + 사용 빈도 + selectedWords 맥락 부스트로 점수 계산
   - LLM 필터링 후 상위 4개 반환

6. AI → BE 응답
   { "words": ["나", "머리", "배", "오늘"] }

7. BE → FE 응답
   {
     "code": "SUCCESS",
     "message": "요청이 성공하였습니다",
     "data": { "step": "subject", "words": ["나", "머리", "배", "오늘"] }
   }

8. FE 화면에 추천 단어 4개 표시
   환자가 "나" 선택 → 다음 단계(object) 요청 시 selectedWords: { subject: "나" } 포함
```

---

## 5. 단어 조합 기반 생성 문장 조회

`POST /api/v1/recommendations/compose`

### 변경사항

| 항목 | 변경 전 (원본 명세) | 변경 후 | 사유 |
|---|---|---|---|
| 요청 필드 추가 | 없음 | `categoryKey` (optional) | FE 타입에 존재 |
| 요청 필드 추가 | 없음 | `guardianMessage` (optional) | 보호자 메시지 맥락 |
| 요청 필드 추가 | 없음 | `recentMessages` (optional) | 최근 대화 맥락 |
| 응답 `sentences` 구조 | `[{ id: Long, content: String }]` | `string[]` | FE 타입 `sentences: string[]` |
| 에러 `MATCHING-801` | | `MATCHING-803` | 에러코드 수정 |

### 최종 명세

**Request Body**

```json
{
  "subject": "나",
  "object": "물",
  "predicate": "마시다",
  "punctuation": ".",
  "categoryKey": "mood",
  "guardianMessage": null,
  "recentMessages": null
}
```

**Response (200 OK)**

```json
{
  "code": "SUCCESS",
  "message": "요청이 성공하였습니다",
  "data": {
    "sentences": ["나 물 마시고 싶어.", "나 물 좀 줘.", "나 물 마실래."]
  }
}
```

**Error Cases**

| 상황 | 에러 코드 | HTTP 상태 |
|---|---|---|
| 선택 단어 전부 없음 | COMMON-101 | 400 |
| 매칭 정보 없음 | MATCHING-803 | 404 |
| AI 추천 생성 실패 | AI-701 | 500 |
| AI 서버 타임아웃 | AI-702 | 502 |

### 흐름도 (FE → BE → AI → DB)

```
1. 환자가 단어 조합 완료 (주어: "나", 목적어: "물", 서술어: "마시다", 부호: ".")

2. FE → BE 요청
   POST /api/v1/recommendations/compose
   Headers: { Authorization: "Bearer {JWT}" }
   Body: { "subject": "나", "object": "물", "predicate": "마시다", "punctuation": "." }

3. BE (RecommendationController.compose)
   - JWT에서 userId 추출 → matchingId 조회 (매칭 검증)
   - 단어 전부 null인지 검증
   - subject/object/predicate/punctuation → ["나", "물", "마시다", "."] 리스트 변환
   - AI 서버에 요청 전달

4. BE → AI 요청
   POST http://eyespeak-ai-caregiver:5003/generate
   Body: { "words": ["나", "물", "마시다", "."], "question": "" }

5. AI (caregiver_server_db.py - generate)
   - _generate_from_words()로 LLM이 단어 조합을 자연스러운 문장 3개로 생성

6. AI → BE 응답
   { "sentences": ["나 물 마시고 싶어.", "나 물 좀 줘.", "나 물 마실래."] }

7. BE → FE 응답
   {
     "code": "SUCCESS",
     "message": "요청이 성공하였습니다",
     "data": { "sentences": ["나 물 마시고 싶어.", "나 물 좀 줘.", "나 물 마실래."] }
   }

8. FE 화면에 생성된 문장 3개 표시, 환자가 하나 선택
```

---

## 6. 추천 문장 발화 (메시지 전송)

`POST /api/v1/recommendations/send`

(점검 예정)
