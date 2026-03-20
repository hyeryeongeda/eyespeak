# EyeSpeak 추천 로직 전체 흐름 (DB 기준)

ALS 환자가 보호자와 대화할 때, **환자가 말하고 싶은 문장을 추천**해주는 시스템입니다.
모든 데이터는 DB 테이블에서 가져옵니다.

> **참고**: 현재 `caregiver_server.py`는 JSON 파일(`data/user/als_patient_dataset.json`, `data/general_sentences*.json`) 기반으로 동작합니다. 아래 내용은 **DB 전환 시** 동일하게 적용되는 로직이며, JSON 필드와 테이블 대응은 문서 하단 "JSON → DB 테이블 대응표"를 참고하세요.

---

## 전체 구조 한눈에 보기

```
┌─────────────────────────────────────────────────────┐
│                    사용자 화면                         │
│                                                       │
│  [A] 환자가 먼저 시작        [B] 보호자가 먼저 시작     │
│   └→ 오늘 기분/일정 선택       └→ 보호자 질문 입력       │
│   └→ /recommend 호출           └→ /categories 호출      │
│                                 └→ 카테고리 선택         │
│                                 └→ /recommend 호출      │
│                                                       │
│          ┌──────────────────────────┐                  │
│          │  추천 문장 3개 표시       │                  │
│          │  또는 "단어로 직접 표현"  │                  │
│          └──────────────────────────┘                  │
│                     │                                  │
│          환자가 문장을 선택하면                          │
│          /expressions/use → USAGE_LOG에 기록            │
└─────────────────────────────────────────────────────┘
```

---

## 추천에 사용하는 DB 테이블

### 핵심 테이블 (추천 로직에 직접 관여)

| 테이블 | 주요 컬럼 | 역할 |
|--------|-----------|------|
| **EXPRESSIONS** | `expr_id`, `matching_id`, `text`, `sentiment`, `category`, `last_used` | 환자가 과거에 사용한 표현 목록 → **user_db** |
| **EXPRESSION_KEYWORDS** | `keyword_id`, `expr_id`, `keyword` | 각 표현에서 추출된 키워드 (명사/동사) |
| **USAGE_LOG** | `matching_id`, `phrase_id`, `expr_id`, `content`, `time_slot_id`, `mood_type`, `mood_level`, `used_at` | 사용 이력. usageCount 집계, 시간대/기분 추적 |
| **USER_WORDS** | `matching_id`, `subjects`(json), `objects`(json), `verbs`(json) | 환자의 단어 모음 (주어/목적어/서술어) |
| **DAILY_MOOD** | `matching_id`, `mood_date`, `mood_type`, `mood_level` | 오늘의 기분 (일당 1건) |
| **GENERAL_CORPUS** | `id`, `content`, `sentiment`, `weight` | 범용 문장 DB (~2700개) → **general_db** |

### 보조 테이블 (일정/시간대 정보)

| 테이블 | 주요 컬럼 | 역할 |
|--------|-----------|------|
| **ROUTINE_SLOT_TAG** | `matching_id`, `time_slot_id`, `activity_tag_id` | 환자의 시간대별 일정 |
| **TIME_SLOT** | `id`, `name`, `start_time`, `end_time` | 시간대 정의 (아침/점심/저녁 등) |
| **ACTIVITY_TAG** | `id`, `name` | 활동 종류 (식사/운동/휴식 등) |
| **MATCHING** | `id`, `patient_id`, `guardian_id` | 환자-보호자 연결. 모든 데이터의 기준 키 |

---

## 데이터 로드 단계 (공통)

모든 API 호출의 시작점. `matching_id`를 기준으로 데이터를 가져옵니다.

```
matching_id (환자-보호자 쌍의 고유 키)
│
├─ user_db 구성
│   EXPRESSIONS (WHERE matching_id = ?)
│   ├── text, sentiment, category, last_used
│   ├── JOIN EXPRESSION_KEYWORDS → keywords[]
│   └── JOIN USAGE_LOG (GROUP BY expr_id → COUNT) → usageCount
│       └→ weight = 1 + log(usageCount + 1)
│
├─ word_lists 구성
│   USER_WORDS (WHERE matching_id = ?)
│   └── subjects(json), objects(json), verbs(json)
│
├─ word_usage_freq 구성
│   USAGE_LOG (WHERE matching_id = ?)
│   └── 각 단어(keyword)가 몇 번 사용됐는지 빈도 계산
│
├─ today_data 구성
│   DAILY_MOOD (WHERE matching_id = ? AND mood_date = TODAY)
│   └── mood_type, mood_level
│
│   ROUTINE_SLOT_TAG (WHERE matching_id = ?)
│   JOIN TIME_SLOT, ACTIVITY_TAG
│   └── 오늘 일정 목록
│
│   USAGE_LOG (WHERE matching_id = ? AND DATE(used_at) = TODAY)
│   └── 오늘 가장 많이 쓴 표현 (GROUP BY expr_id → COUNT DESC LIMIT 1)
│   └── 마지막 사용 기록 (ORDER BY used_at DESC LIMIT 1)
│
└─ general_db 구성
    GENERAL_CORPUS (전체)
    └── content, sentiment, weight(기본 1.0)
```

---

## [A] 환자가 먼저 시작하는 경우

### 데이터 흐름

```
① 화면에 4개 타일 표시 (today_data에서 가져옴)
│
│  ┌─ 오늘의 기분
│  │  ← DAILY_MOOD.mood_type (예: "행복")
│  │  → 감정 매핑: 행복/기쁨 → "긍정", 슬픔/불안/분노 → "부정", 평온/피곤 → "중립"
│  │
│  ├─ 오늘 일정
│  │  ← ROUTINE_SLOT_TAG + TIME_SLOT + ACTIVITY_TAG
│  │  → 현재 시간대의 활동 (예: "아침 식사")
│  │
│  ├─ 자주 쓴 표현
│  │  ← USAGE_LOG (오늘 날짜, GROUP BY expr_id → COUNT DESC)
│  │  → 오늘 가장 많이 쓴 카테고리/표현
│  │
│  └─ 직전 사용
│     ← USAGE_LOG (ORDER BY used_at DESC LIMIT 1)
│     → 마지막으로 사용한 표현/기능
│
② 환자가 타일 선택 → 자연어 질문 생성 + 감정 필터
│
③ /recommend 호출 → 문장 3개 추천
```

### 감정 매핑 (DAILY_MOOD.mood_type → sentiment)

| mood_type | → sentiment |
|-----------|------------|
| 행복, 기쁨 | 긍정 |
| 슬픔, 불안, 분노 | 부정 |
| 평온, 피곤 | 중립 |

---

## [B] 보호자가 먼저 시작하는 경우

### 데이터 흐름

```
① 보호자가 질문 입력 (예: "오늘 기분이 어때?")

② /categories 호출
│
│  EXPRESSIONS + EXPRESSION_KEYWORDS (WHERE matching_id = ?)
│  └→ 질문과 유사한 과거 표현 검색 (임베딩 유사도)
│  └→ 유사 표현의 keywords를 LLM 힌트로 제공
│
│  LLM이 생성:
│  ├── categories: ["좋아", "별로야", "그냥 그래"]
│  ├── sentimentMap: {"좋아": "긍정", "별로야": "부정", ...}
│  └── intentMap: {"좋아": "감정", "별로야": "감정", ...}
│
③ 환자가 카테고리 선택 (예: "좋아")
│  → sentiment = "긍정", intent = "감정"
│
④ /recommend 호출 → 문장 3개 추천
```

---

## 문장 추천 핵심 로직 (`/recommend`)

> A 모드든 B 모드든, 최종적으로 이 로직을 거쳐 문장 3개가 나옴

### 전체 파이프라인

```
입력: question(질문), sentiment(감정, 선택), selected_category(카테고리, 선택)

  ① 데이터 로드
  │  EXPRESSIONS + EXPRESSION_KEYWORDS + USAGE_LOG → user_db
  │  각 항목의 weight = 1 + log(usageCount + 1)
  │     usageCount = USAGE_LOG에서 해당 expr_id의 COUNT
  │
  ② 의도 필터 (selected_category가 있으면)
  │  카테고리에 매핑된 intent 추출
  │  → EXPRESSIONS.category와 비교하여 일치 시 가산점
  │
  ③ 감정 필터 (sentiment가 있으면)
  │  user_db에서 EXPRESSIONS.sentiment = 해당 감정인 것만 남김
  │  GENERAL_CORPUS에서도 sentiment 일치하는 것만 남김
  │  (단, 필터 후 문장이 너무 적으면 필터 해제)
  │
  ④ 임베딩 유사도 검색
  │  질문과 각 문장(EXPRESSIONS.text / GENERAL_CORPUS.content)을
  │  벡터로 변환 → 코사인 유사도 계산
  │
  ⑤ 점수 계산 (user_db)
  │  최종점수 = 코사인유사도 × weight × 시간대보정 × 의도보정
  │
  ⑥ 혼합 검색
  │  user_db(EXPRESSIONS) 상위 3개 + general_db(GENERAL_CORPUS) 상위 3개
  │  = 후보 6개
  │
  ⑦ LLM 정제
  │  후보 6개 → LLM이 자연스럽게 다듬어서 최종 3개 반환
  │
  출력: 추천 문장 3개
```

### 가중치 & 점수 상세

| 요소 | 데이터 출처 | 계산 방식 | 설명 |
|------|------------|-----------|------|
| **사용빈도 가중치** | `USAGE_LOG` (expr_id별 COUNT) | `1 + log(usageCount + 1)` | 많이 쓴 표현일수록 높은 점수. log 스케일로 극단적 편향 방지 |
| **시간대 보정** | `EXPRESSIONS.last_used` vs 현재시각 | 같은 시각이면 ×1.2, 같은 요일이면 ×1.1 | "아침에 주로 쓰는 표현"처럼 시간 패턴 반영 |
| **의도 보정** | `EXPRESSIONS.category` | 의도 일치하면 ×1.5 | 선택한 카테고리의 의도와 맞는 표현 우선 |
| **코사인 유사도** | `EXPRESSIONS.text` / `GENERAL_CORPUS.content` | `(a·b) / (‖a‖ × ‖b‖)` | 질문과 문장의 의미적 거리 |
| **범용 문장 가중치** | `GENERAL_CORPUS.weight` | 기본 1.0 (고정) | 개인 표현보다 낮은 기본 점수 |

**점수 예시:**
```
"어깨 아파" (USAGE_LOG에서 9회 사용, 같은 시각에 자주 사용, category=통증)
= 코사인유사도(0.7) × weight(3.3) × 시간대(1.2) × 의도(1.5)
= 0.7 × 3.3 × 1.2 × 1.5 = 4.16

GENERAL_CORPUS의 "오늘 날씨 좋다" (weight=1.0, 시간대/의도 보정 없음)
= 코사인유사도(0.5) × weight(1.0)
= 0.5
```

### LLM 정제 규칙

- 정확히 **3문장** 생성
- 보호자 질문의 시제에 맞춤 (과거형/현재형)
- **반말 구어체**, **15자 이내**
- 감정 필터가 있으면: 3문장 모두 같은 톤
- 감정 필터가 없으면: 긍정 1개 + 부정/중립 2개로 다양하게

---

## 단어로 직접 표현 모드

> 추천 문장이 마음에 안 들 때, 단어를 하나씩 골라 문장을 만드는 모드

### 4단계 순서

```
① 주어 선택 → /words (category=subjects)
② 목적어 선택 → /words (category=objects)
③ 서술어 선택 → /words (category=verbs)
④ 문장부호 선택 → 고정값 (., !, ?)

→ 선택된 단어들로 /generate 호출 → LLM이 문장 3개 생성
```

### 단어 추천 로직 (`/words`)

```
① 유사 문장 검색 (k=15)
│  EXPRESSIONS.text 중 질문과 유사한 것 15개 검색
│
② 후보 추출
│  EXPRESSION_KEYWORDS에서 유사 문장의 keywords 가져오기
│  + 형태소 분석으로 명사/동사 추출
│
③ LLM 필터
│  후보 중에서 해당 카테고리에 맞는 것만 선별
│  (주어 → 명사만, 서술어 → 동사/형용사만)
│
④ 나머지 단어 정렬
│  USER_WORDS에서 아직 안 나온 단어들을 점수순 정렬
│  점수 = 유사도 × (1 + 0.5 × 빈도) × 맥락보정
│
│  빈도: USAGE_LOG에서 해당 단어가 포함된 표현의 사용 횟수
│  맥락보정: 이전 단계에서 고른 단어와의 유사도 (α=0.4)
│  예: 주어로 "어깨"를 골랐으면 → "아프다"가 "먹다"보다 높은 점수
│
⑤ 상위 4개 반환 (/words)
   새로고침 시 다음 4개 반환 (/words_all), 순서 셔플
```

---

## 표현 사용 기록 (`/expressions/use`)

> 환자가 문장을 선택하면 DB에 사용 이력이 저장됨

```
환자가 문장 선택 (예: "어깨가 아파")
│
├─ EXPRESSIONS에 이미 있는 표현이면:
│   USAGE_LOG에 새 행 INSERT (expr_id, used_at, time_slot_id 등)
│   EXPRESSIONS.last_used = 현재시각으로 UPDATE
│
└─ EXPRESSIONS에 없는 새 표현이면:
    │
    ① 감정·의도 분류
    │  1차: 키워드 매칭 ("아파" → sentiment=부정, category=통증)
    │  2차: 판단 안 되면 LLM 호출
    │
    ② 키워드 자동 추출
    │  형태소 분석 → 명사, 동사/형용사 추출
    │
    ③ EXPRESSIONS에 INSERT
    │  (matching_id, text, sentiment, category, last_used)
    │
    ④ EXPRESSION_KEYWORDS에 INSERT
    │  (expr_id, keyword) × 추출된 키워드 수만큼
    │
    ⑤ USER_WORDS UPDATE
    │  새 키워드를 주어/목적어/서술어로 분류하여 JSON에 추가
    │  - 주어 판단: 화이트리스트 (나, 우리, 엄마, 아빠, 여보 등)
    │  - 각 카테고리 최대 50개, 초과 시 빈도 낮은 단어 제거
    │
    ⑥ USAGE_LOG에 INSERT
       (matching_id, expr_id, content, time_slot_id, used_at)
```

### 의도(category) 분류 키워드

> 실제 매칭 순서·키워드 집합은 `caregiver_server.py`의 `_INTENT_KEYWORD_ORDER`, `_INTENT_KEYWORDS` 참고.

| 의도 | 키워드 예시 |
|------|------------|
| 통증 | 아파, 쑤시, 뻐근, 저리, 불편 |
| 욕구 | 먹고 싶, 마시고 싶, 하고 싶, 볼래, 주세요, 보고 싶 |
| 음식 | 밥, 물, 약, 간식, 배고파, 목말라 |
| 요청 | 도와, 해줘, 바꿔, 켜줘, 꺼줘, 올려, 내려, 좀 줘 |
| 감정 | 좋아, 싫어, 슬프, 행복, 화나, 기쁘, 우울, 별로, 괜찮, 그저 |
| 일상 | 잘 잤, 피곤, 심심, 같이, 오늘 |
| 기타 | 위에 해당 안 되는 경우 (키워드 1차 후 LLM 보조) |

---

## JSON → DB 테이블 대응표

| 기존 JSON 필드 | DB 테이블 | DB 컬럼 |
|----------------|-----------|---------|
| `pastExpressions[].text` | **EXPRESSIONS** | `text` |
| `pastExpressions[].sentiment` | **EXPRESSIONS** | `sentiment` |
| `pastExpressions[].categories` | **EXPRESSIONS** | `category` |
| `pastExpressions[].keywords` | **EXPRESSION_KEYWORDS** | `keyword` (expr_id로 JOIN) |
| `pastExpressions[].usageCount` | **USAGE_LOG** | `COUNT(*) WHERE expr_id = ?` |
| `pastExpressions[].lastUsed` | **EXPRESSIONS** | `last_used` |
| `pastWords.subjects/objects/verbs` | **USER_WORDS** | `subjects`, `objects`, `verbs` (JSON) |
| `todayData.mood` | **DAILY_MOOD** | `mood_type`, `mood_level` |
| `todayData.schedule` | **ROUTINE_SLOT_TAG** + **TIME_SLOT** + **ACTIVITY_TAG** | JOIN 결과 |
| `todayData.mostUsedToday` | **USAGE_LOG** | `GROUP BY expr_id, DATE(used_at) = TODAY → COUNT DESC` |
| `todayData.lastUsedFeature` | **USAGE_LOG** | `ORDER BY used_at DESC LIMIT 1` |
| `general_sentences` | **GENERAL_CORPUS** | `content`, `sentiment`, `weight` |

---

## 추천에 필요한 주요 쿼리 (개념)

```sql
-- 1. user_db 구성: 환자의 과거 표현 + 사용횟수 + 키워드
SELECT e.expr_id, e.text, e.sentiment, e.category, e.last_used,
       COUNT(ul.id) AS usage_count,
       GROUP_CONCAT(ek.keyword) AS keywords
FROM EXPRESSIONS e
LEFT JOIN USAGE_LOG ul ON ul.expr_id = e.expr_id
LEFT JOIN EXPRESSION_KEYWORDS ek ON ek.expr_id = e.expr_id
WHERE e.matching_id = ?
GROUP BY e.expr_id;

-- 2. 오늘 기분
SELECT mood_type, mood_level
FROM DAILY_MOOD
WHERE matching_id = ? AND mood_date = CURDATE();

-- 3. 오늘 일정
SELECT ts.name AS time_slot, at.name AS activity
FROM ROUTINE_SLOT_TAG rst
JOIN TIME_SLOT ts ON ts.id = rst.time_slot_id
JOIN ACTIVITY_TAG at ON at.id = rst.activity_tag_id
WHERE rst.matching_id = ?;

-- 4. 오늘 가장 많이 쓴 표현
SELECT e.text, e.category, COUNT(*) AS cnt
FROM USAGE_LOG ul
JOIN EXPRESSIONS e ON e.expr_id = ul.expr_id
WHERE ul.matching_id = ? AND DATE(ul.used_at) = CURDATE()
GROUP BY ul.expr_id
ORDER BY cnt DESC LIMIT 1;

-- 5. 마지막 사용 기록
SELECT e.text, e.category, ul.used_at
FROM USAGE_LOG ul
JOIN EXPRESSIONS e ON e.expr_id = ul.expr_id
WHERE ul.matching_id = ?
ORDER BY ul.used_at DESC LIMIT 1;

-- 6. 단어 모음
SELECT subjects, objects, verbs
FROM USER_WORDS
WHERE matching_id = ?;

-- 7. 범용 문장 (감정 필터 있을 때)
SELECT content, sentiment, weight
FROM GENERAL_CORPUS
WHERE sentiment = ?;
```

---

## 모델 & API

| 구성요소 | 역할 |
|----------|------|
| **Bi-encoder** (`paraphrase-multilingual-MiniLM-L12-v2`) | 문장을 384차원 벡터로 변환 → 코사인 유사도로 의미적 유사성 측정 |
| **LLM** (`gpt-4o-mini`) | 카테고리 생성, 문장 정제, 단어 필터링 |
| **Okt** (선택) | 한국어 형태소 분석 (명사/동사 추출) |

---

## 핵심 제약 조건

| 제약 | 이유 |
|------|------|
| 문장 **15자 이내** | ALS 환자의 의사소통 특성 |
| **반말 구어체** | 환자-보호자 간 일상 대화 |
| 각 카테고리 단어 **최대 50개** | USER_WORDS JSON 크기 관리 |
| DAILY_MOOD **일당 1건** | mood_date + matching_id UNIQUE |
| GENERAL_CORPUS weight **기본 1.0** | 개인 표현에 비해 낮은 우선순위 |
| mood_type **7종** | 슬픔/행복/평온/기쁨/불안/분노/피곤 |
| mood_level **1~5** | 1-2: 조금, 3: 보통, 4-5: 매우 |
