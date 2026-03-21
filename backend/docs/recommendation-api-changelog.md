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

---

## 3. 보호자 메시지 기반 추천 응답 조회

`POST /api/v1/recommendations/replies`

(점검 예정)

---

## 4. 단계별 추천 단어 조회

`POST /api/v1/recommendations/words`

(점검 예정)

---

## 5. 단어 조합 기반 생성 문장 조회

`POST /api/v1/recommendations/compose`

(점검 예정)

---

## 6. 추천 문장 발화 (메시지 전송)

`POST /api/v1/recommendations/send`

(점검 예정)
