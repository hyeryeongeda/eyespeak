# AI 서버 DB 직접 접근 → BE REST API 경유로 전환

## 배경

현재 AI 서버(Python)가 pymysql로 DB에 직접 접근하고 있음.
보안/유지보수를 위해 AI 서버 → BE(Spring Boot) REST API → DB 구조로 전환.

```
Before: AI 서버 → pymysql → DB 직접 접근
After:  AI 서버 → requests → BE(Spring Boot) → JPA → DB
```

---

## 전체 API 역할 분담

| 담당 | 엔드포인트 | 호출 방향 | 상태 |
|---|---|---|---|
| BE (팀원) | `GET /api/v1/ai/user-context/{matchingId}` | AI → BE | 새로 만들기 |
| BE (팀원) | `GET /api/v1/ai/general-corpus` | AI → BE | 새로 만들기 |
| AI (예린) | `POST /expressions/classify` | BE → AI | `/expressions/use`에서 DB 저장 빼고 분류만 반환하도록 수정 |
| AI (기존) | `POST /recommend/category` | BE → AI | 기존 유지 |
| AI (기존) | `POST /recommend/replies` | BE → AI | 기존 유지 |
| AI (기존) | `POST /words` | BE → AI | 기존 유지 |
| AI (기존) | `POST /generate` | BE → AI | 기존 유지 |

---

## BE가 만들어야 할 것: API 3개 + 기존 코드 수정 1건

| # | 내용 | 방식 |
|---|---|---|
| API 1 | 추천에 필요한 데이터 조회 | BE가 새 API 만들기 |
| API 2 | 일반 말뭉치 데이터 전체 조회 | BE가 새 API 만들기 |
| API 3 | 사용자 표현 → AI가 분류 → BE가 DB에 저장 | AI `/expressions/classify` + BE ChatService에서 저장 |
| 수정 1 | 카테고리별 힌트 조회 | 별도 API 없이 BE가 RecommendationController에서 직접 DB 조회 |

---

### API 1. 환자 추천 컨텍스트 통합 조회

AI 서버가 추천할 때 **매번** 호출하는 핵심 API. 이게 없으면 추천 자체가 안 됨.

- **URL:** `GET /api/v1/ai/user-context/{matchingId}`
- **용도:** AI 서버의 `_load_user_data_from_db()` 대체 (caregiver_server_db.py 99줄)
- **조회 테이블:** expressions, usage_log, expression_keywords, user_words, daily_mood, routine_slot_tag, time_slot, activity_tag

#### 흐름

```
1. 환자가 추천을 요청함 ( 맞춤 대화, 채팅 답변, 단어 조합 등)
2. FE → BE RecommendationController 호출
3. BE → AI 서버에 추천 요청
4. AI가 추천하려면 환자 데이터가 필요함
5. AI → BE GET /ai/user-context/{matchingId} 호출 (새로 만드는 API)
6. BE가 DB에서 6가지 데이터 조회해서 한 번에 반환
7. AI가 그 데이터로 임베딩 검색 + LLM 호출 → 추천 문장 3개 생성
8. AI → BE에 추천 결과 반환
9. BE → FE에 반환
```

#### 현재 AI 서버가 하는 SQL 쿼리 6개

```sql
-- 쿼리 1: 환자의 모든 표현 + 사용횟수 + 키워드 (3개 테이블 JOIN)
SELECT e.id AS expr_id, e.content AS text, e.sentiment, e.category,
       e.last_used AS lastUsed,
       COUNT(ul.id) AS usageCount,
       GROUP_CONCAT(ek.keyword SEPARATOR ';;') AS keywords_str
FROM expressions e
LEFT JOIN usage_log ul ON ul.expr_id = e.id
LEFT JOIN expression_keywords ek ON ek.expr_id = e.id
WHERE e.matching_id = ?
GROUP BY e.id;

-- 쿼리 2: 단어 조합 키보드용 단어 목록
SELECT subjects, objects, verbs FROM user_words WHERE matching_id = ?;

-- 쿼리 3: 오늘 기분
SELECT mood_type, mood_level FROM daily_mood
WHERE matching_id = ? AND mood_date = CURDATE();

-- 쿼리 4: 오늘 일정 (3개 테이블 JOIN)
SELECT ts.name AS time_slot, at.name AS activity
FROM routine_slot_tag rst
JOIN time_slot ts ON ts.id = rst.time_slot_id
JOIN activity_tag at ON at.id = rst.activity_tag_id
WHERE rst.matching_id = ?;

-- 쿼리 5: 오늘 가장 많이 쓴 표현 (GROUP BY + COUNT + ORDER BY → 커스텀 쿼리 필요)
SELECT e.content AS text, e.category, COUNT(*) AS cnt
FROM usage_log ul
JOIN expressions e ON e.id = ul.expr_id
WHERE ul.matching_id = ? AND DATE(ul.used_at) = CURDATE()
GROUP BY ul.expr_id
ORDER BY cnt DESC LIMIT 1;

-- 쿼리 6: 마지막 사용 표현 (ORDER BY + LIMIT → 커스텀 쿼리 필요)
SELECT e.content AS text, e.category, ul.used_at
FROM usage_log ul
JOIN expressions e ON e.id = ul.expr_id
WHERE ul.matching_id = ?
ORDER BY ul.used_at DESC LIMIT 1;
```

#### BE가 만들어야 할 JPA 코드

**쿼리 1~4:** 단순 조회라 JPA가 메서드 이름으로 자동 생성 가능

```java
// 쿼리 1: expressions 조회 → JPA 자동 생성
expressionRepository.findByMatchingId(matchingId);
// + 각 expression마다:
usageLogRepository.countByExpressionId(expr.getId());
expressionKeywordRepository.findByExprId(expr.getId());

// 쿼리 2: user_words → JPA 자동 생성
userWordsRepository.findByMatchingId(matchingId);

// 쿼리 3: daily_mood → JPA 자동 생성
dailyMoodRepository.findByMatchingIdAndMoodDate(matchingId, LocalDate.now());

// 쿼리 4: routine_slot_tag → JPA @ManyToOne으로 자동 JOIN
routineSlotTagRepository.findByMatchingId(matchingId);
```

**쿼리 5~6:** GROUP BY + COUNT + ORDER BY가 필요해서 `@Query`로 직접 작성 필요

```java
// 쿼리 5: 오늘 가장 많이 쓴 표현 (UsageLogRepository에 추가)
@Query("SELECT e.content AS text, e.category AS category, COUNT(ul) AS cnt " +
       "FROM UsageLog ul JOIN ul.expression e " +
       "WHERE ul.matching.id = :matchingId AND FUNCTION('DATE', ul.usedAt) = CURRENT_DATE " +
       "GROUP BY ul.expression " +
       "ORDER BY cnt DESC")
List<Object[]> findMostUsedToday(@Param("matchingId") Long matchingId, Pageable pageable);
// 사용: findMostUsedToday(matchingId, Pageable.ofSize(1)) → 1위만 가져옴

// 쿼리 6: 마지막 사용 표현 (UsageLogRepository에 추가)
@Query("SELECT e.content AS text, e.category AS category, ul.usedAt AS usedAt " +
       "FROM UsageLog ul JOIN ul.expression e " +
       "WHERE ul.matching.id = :matchingId " +
       "ORDER BY ul.usedAt DESC")
List<Object[]> findLatestByMatchingId(@Param("matchingId") Long matchingId, Pageable pageable);
// 사용: findLatestByMatchingId(matchingId, Pageable.ofSize(1)) → 최신 1개만
```

#### Response 형식

```json
{
  "code": "SUCCESS",
  "data": {
    "userExpressions": [
      {
        "exprId": 1,
        "text": "물 좀 줘",
        "sentiment": "NEUTRAL",
        "category": "영양/수분",
        "lastUsed": "2026-03-13T11:30:00",
        "usageCount": 5,
        "keywords": ["물", "주다"]
      }
    ],
    "wordLists": {
      "subjects": ["나", "우리", "손녀딸"],
      "objects": ["물", "음식", "약"],
      "verbs": ["먹다", "마시다", "보다"],
      "punctuation": [".", "!", "?"]
    },
    "todayData": {
      "mood": "HAPPY",
      "moodLevel": 4,
      "schedule": [
        { "time": "기상/아침", "event": "경관식/수분 섭취" },
        { "time": "오전", "event": "재활/ROM 운동" }
      ],
      "mostUsedToday": {
        "category": "영양/수분",
        "expression": "물 좀 줘",
        "count": 3
      },
      "lastUsedFeature": {
        "category": "영양/수분",
        "expression": "물 좀 줘",
        "time": "11:30"
      }
    }
  }
}
```

**wordLists 기본값 (user_words 데이터 없을 때 BE가 이 값을 내려줘야 함):**
```json
{
  "subjects": ["나", "우리", "손녀딸", "딸", "여보"],
  "objects": ["물", "음식", "약"],
  "verbs": ["먹다", "마시다", "보다", "좋아하다"],
  "punctuation": [".", "!", "?"]
}
```

**todayData 각 필드는 null 가능 (데이터 없을 때):**
- `mood`, `moodLevel` → daily_mood에 오늘 기록 없으면 null
- `schedule` → routine_slot_tag에 데이터 없으면 빈 배열 `[]`
- `mostUsedToday` → 오늘 usage_log 없으면 null
- `lastUsedFeature` → usage_log 자체가 없으면 null

---

### API 2. 범용 말뭉치 전체 조회

AI 서버 기동 시 **1회만** 호출. 이후 메모리에 캐시해서 재호출 없음.

- **URL:** `GET /api/v1/ai/general-corpus`
- **용도:** AI 서버의 `_load_general_db_from_db()` 대체 (caregiver_server_db.py 232줄)
- **조회 테이블:** general_corpus

#### 흐름

```
1. AI 서버가 처음 기동됨 (Docker 컨테이너 시작)
2. AI → BE GET /ai/general-corpus 호출 (새로 만드는 API)
3. BE가 general_corpus 테이블 전체 조회 (약 1200건)
4. BE → AI에 반환
5. AI가 메모리에 캐시 (서버 꺼질 때까지 유지)
6. 이후 추천할 때 캐시된 데이터 사용 (재호출 없음)
```

#### 현재 AI 서버가 하는 SQL 쿼리

```sql
-- 단순 전체 조회
SELECT content, sentiment, weight FROM general_corpus;
```

#### BE가 만들어야 할 JPA 코드

```java
@GetMapping("/ai/general-corpus")
public ApiResponse<List<GeneralCorpusResponse>> getGeneralCorpus() {
    // generalCorpusRepository.findAll()
    // → 단순 전체 조회, JPA 자동 생성
    return ApiResponse.success(corpusList);
}
```

**가장 단순한 API.** `findAll()` 한 줄이면 끝.

#### Response 형식

```json
{
  "code": "SUCCESS",
  "data": [
    { "content": "응, 재밌었어", "sentiment": "POSITIVE", "weight": 1.0 },
    { "content": "별로야", "sentiment": "NEGATIVE", "weight": 1.0 },
    { "content": "물 좀 줘", "sentiment": "NEUTRAL", "weight": 1.0 }
  ]
}
```

**참고:** 현재 general_corpus 테이블에 약 1200행. data.sql에 시드 데이터로 들어가 있음.

---

### API 3. 사용자 표현 → AI가 분류 → BE가 DB에 저장

기존 `/expressions/use`(AI)가 분류 + DB 저장 둘 다 했던 걸, **분류는 AI(`/expressions/classify`), 저장은 BE**로 분리.

#### 흐름

```
1. 환자가 메시지를 보냄 (추천 문장 선택 / 단어 조합 / 키보드 직접 입력 / 답변 추천 등 모든 경우)
2. FE → BE 웹소켓으로 메시지 전송 → message 테이블 저장
3. BE ChatService → AI POST /expressions/classify 호출 (text만 넘김)
4. AI가 감정/의도 분류 + 키워드 추출 (AI 내부에서 처리)
5. AI → BE에 분류 결과 반환 { sentiment, category, keywords }
6. BE가 직접 expressions + expression_keywords + usage_log에 저장
```

**환자가 보내는 모든 메시지**가 대상 (추천 문장뿐 아니라 키보드 입력, 단어 조합 등 전부 포함)

#### AI `/expressions/classify` (예린이 수정)

기존 `/expressions/use`에서 DB 저장 로직 빼고, 분류 결과만 반환.

```
Request:  { "text": "물 좀 줘" }
Response: { "sentiment": "NEUTRAL", "category": "영양/수분", "keywords": ["물", "주다"] }
```

#### BE ChatService (팀원이 수정)

AI한테 분류 결과 받아서 BE가 직접 DB 저장.

```java
// ChatService.sendMessage() 안에 추가:
if (senderRole == Role.PATIENT) {
    // 1. AI에 분류 요청
    Map classifyResult = restTemplate.postForObject(
        aiServerUrl + "/expressions/classify",
        Map.of("text", messageText), Map.class);

    String sentiment = (String) classifyResult.get("sentiment");
    String category = (String) classifyResult.get("category");
    List<String> keywords = (List<String>) classifyResult.get("keywords");

    // 2. expressions 저장 (있으면 last_used 업데이트, 없으면 INSERT)
    // 3. expression_keywords 저장 (새 표현일 때)
    // 4. usage_log 저장 (time_slot_id는 현재 시각 기준 자동 계산)
}
```

#### 시간대 → time_slot_id 매핑 (BE에서 자동 계산)

```
06~09시 → 1 (기상/아침)
09~12시 → 2 (오전)
12~15시 → 3 (점심/낮)
15~18시 → 4 (오후)
18~21시 → 5 (저녁)
21~24시 → 6 (취침 준비)
00~06시 → 7 (야간)
```

---

### 수정 1. 카테고리 힌트 — 별도 API 없이 BE가 직접 DB 조회

별도 API 만들지 않고, 기존 `RecommendationController.getCategories()` (75줄)에서 **AI에 힌트 요청하는 부분을 BE가 직접 DB 조회하는 것으로** 변경.

#### 현재 코드 (91~98줄)

```java
// 현재: AI 서버에 힌트 요청
Map result = restTemplate.postForObject(
    aiServerUrl + "/recommend/hints", buildRequest(body), Map.class);
moodHint = (String) result.get("mood_hint");
scheduleHint = (String) result.get("schedule_hint");
frequentHint = (String) result.get("frequent_hint");
recentHint = (String) result.get("recent_hint");
```

#### 변경할 코드

```java
// 변경: BE가 직접 DB 조회
// 1. moodHint → JPA 자동 생성
DailyMood mood = dailyMoodRepository
    .findByMatchingIdAndMoodDate(matchingId, LocalDate.now()).orElse(null);
String moodHint = mood != null ? moodTypeToKorean(mood.getMoodType()) : null;

// 2. scheduleHint → JPA 자동 생성
int slotId = calculateTimeSlotId(LocalTime.now());
RoutineSlotTag routine = routineSlotTagRepository
    .findByMatchingIdAndTimeSlotId(matchingId, slotId).orElse(null);
String scheduleHint = routine != null ? routine.getActivityTag().getName() : null;

// 3. frequentHint → 커스텀 쿼리 (@Query 필요)
// UsageLogRepository에 추가:
@Query("SELECT e.content FROM UsageLog ul JOIN ul.expression e " +
       "WHERE ul.matching.id = :matchingId " +
       "GROUP BY ul.expression ORDER BY COUNT(ul) DESC")
List<String> findMostFrequentExpression(@Param("matchingId") Long matchingId, Pageable pageable);
// 사용: findMostFrequentExpression(matchingId, Pageable.ofSize(1))

// 4. recentHint → 커스텀 쿼리 (@Query 필요)
// UsageLogRepository에 추가:
@Query("SELECT e.content FROM UsageLog ul JOIN ul.expression e " +
       "WHERE ul.matching.id = :matchingId " +
       "ORDER BY ul.usedAt DESC")
List<String> findMostRecentExpression(@Param("matchingId") Long matchingId, Pageable pageable);
// 사용: findMostRecentExpression(matchingId, Pageable.ofSize(1))
```

#### moodType 한글 매핑 (BE에서 변환)

```java
private String moodTypeToKorean(MoodType type) {
    return switch (type) {
        case HAPPY -> "기분 좋음";
        case SAD -> "슬픔";
        case CALM -> "평온";
        case JOYFUL -> "즐거움";
        case ANXIOUS -> "불안";
        case ANGRY -> "화남";
        case TIRED -> "피곤";
    };
}
```

#### 시간대 → time_slot_id 계산

```java
private int calculateTimeSlotId(LocalTime now) {
    int hour = now.getHour();
    if (hour < 6) return 7;       // 야간
    if (hour < 9) return 1;       // 기상/아침
    if (hour < 12) return 2;      // 오전
    if (hour < 15) return 3;      // 점심/낮
    if (hour < 18) return 4;      // 오후
    if (hour < 21) return 5;      // 저녁
    return 6;                     // 취침 준비
}
```

**참고:** 커스텀 쿼리 3, 4는 API 1의 쿼리 5, 6과 거의 같음. 같은 Repository 메서드 재활용 가능.

---

## AI 서버(예린)가 바꿀 부분

BE API가 나오면, AI 서버 `caregiver_server_db.py`에서 3곳 수정 + 1곳 삭제.

### 변경 1. `_load_user_data_from_db()` → BE API 호출 (99줄, 130줄 → 15줄)

```python
# Before: pymysql로 DB 직접 조회 (SQL 쿼리 6개)
def _load_user_data_from_db(matching_id):
    conn = get_db()
    # ... 130줄의 SQL 쿼리 ...

# After: BE API 호출 1번
def _load_user_data_from_db(matching_id):
    resp = requests.get(f"{BE_API_URL}/ai/user-context/{matching_id}")
    if resp.status_code != 200:
        return None
    data = resp.json()["data"]
    user_db = []
    for expr in data["userExpressions"]:
        user_db.append({
            "text": expr["text"],
            "source": "user",
            "sentiment": SENTIMENT_MAP_REVERSE.get(expr["sentiment"], "중립"),
            "categories": [expr["category"]] if expr["category"] else [],
            "keywords": expr["keywords"],
            "weight": 1.0 + math.log((expr["usageCount"] or 0) + 1),
            "lastUsed": expr["lastUsed"],
        })
    return {
        "today_data": data["todayData"],
        "user_db": user_db,
        "word_lists": data["wordLists"],
        "word_usage_freq": _calc_word_usage_freq(user_db, data["wordLists"]),
    }
```

### 변경 2. `_load_general_db_from_db()` → BE API 호출 (232줄, 18줄 → 12줄)

```python
# Before: pymysql로 DB 직접 조회
def _load_general_db_from_db():
    conn = get_db()
    # ...

# After: BE API 호출 1번
def _load_general_db_from_db():
    resp = requests.get(f"{BE_API_URL}/ai/general-corpus")
    rows = resp.json()["data"]
    return [
        {
            "text": row["content"],
            "source": "general",
            "weight": float(row["weight"]) if row["weight"] else 1.0,
            "sentiment": SENTIMENT_MAP_REVERSE.get(row["sentiment"], "중립"),
        }
        for row in rows
    ]
```

### 변경 3. `/expressions/use` → `/expressions/classify`로 변경 (877줄)

DB 저장 로직 제거, **분류 결과만 반환**하도록 수정.

```python
# Before: AI가 분류 + DB 직접 INSERT
@app.route("/expressions/use", methods=["POST"])
def record_expression_use():
    sentiment_kr, intent = _classify_sentence_for_storage(text)
    new_keywords = _auto_generate_keywords(text)
    conn = get_db()
    cur.execute("INSERT INTO expressions ...")    # DB 저장
    cur.execute("INSERT INTO expression_keywords ...")  # DB 저장
    cur.execute("INSERT INTO usage_log ...")       # DB 저장
    conn.commit()

# After: 분류만 하고 결과 반환 (DB 저장 안 함)
@app.route("/expressions/classify", methods=["POST"])
def classify_expression():
    data = request.json or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text 필수"}), 400

    # AI가 감정/의도 분류 (기존 로직 그대로)
    sentiment_kr, intent = _classify_sentence_for_storage(text)
    sentiment_db = SENTIMENT_MAP.get(sentiment_kr, "NEUTRAL")

    # AI가 키워드 추출 (기존 로직 그대로)
    keywords = _auto_generate_keywords(text)

    # DB 저장 없이 분류 결과만 반환 → BE가 저장함
    return jsonify({
        "sentiment": sentiment_db,
        "category": intent,
        "keywords": keywords,
    })
```

### 변경 4. `/recommend/hints` 엔드포인트 삭제 (955줄)

BE가 `RecommendationController.getCategories()`에서 직접 힌트를 조회하므로 삭제.

```python
# Before: 80줄의 SQL 쿼리 4개
@app.route("/recommend/hints", methods=["POST"])
def recommend_hints():
    conn = get_db()
    # ...

# After: 삭제
```

### 공통 변경

```python
# 삭제할 것
import pymysql                    # 더 이상 불필요
DB_CONFIG = { ... }                # 삭제
def get_db(): ...                  # 삭제

# 추가할 것
import requests
BE_API_URL = os.getenv("BE_API_URL", "http://eyespeak-backend:8080/api/v1")
```

---

## 체크리스트

### BE 담당자 (팀원)
- [ ] `GET /api/v1/ai/user-context/{matchingId}` 구현 (쿼리 6개, 커스텀 쿼리 2개)
- [ ] `GET /api/v1/ai/general-corpus` 구현 (findAll 1개)
- [ ] `RecommendationController.getCategories()` 91~98줄 수정 (AI 힌트 요청 → BE 직접 DB 조회)
- [ ] ChatService에 AI `/expressions/classify` 호출 + 분류 결과로 DB 저장 로직 추가
- [ ] SecurityConfig에 `/api/v1/ai/**` permitAll 추가 (AI 서버 접근 허용)
- [ ] UsageLogRepository에 커스텀 쿼리 2개 추가 (API 1, 힌트 모두에서 재활용)

### AI 담당자 (예린)
- [ ] BE API 나오면 response 형식 확인
- [ ] `_load_user_data_from_db()` → BE API 호출로 변경 (130줄 → 15줄)
- [ ] `_load_general_db_from_db()` → BE API 호출로 변경 (18줄 → 12줄)
- [ ] `/expressions/use` → `/expressions/classify`로 변경 (DB 저장 제거, 분류만 반환)
- [ ] `/recommend/hints` 엔드포인트 삭제 (BE가 직접 처리)
- [ ] pymysql, DB_CONFIG, get_db() 삭제
- [ ] `import requests` + `BE_API_URL` 환경변수 추가
- [ ] AI 서버 재시작 후 전체 테스트

### 공통
- [ ] Docker 환경변수에 `BE_API_URL` 추가 (.env.ai)
- [ ] dev 서버에서 전체 흐름 테스트
- [ ] AI 서버 Dockerfile에서 pymysql 의존성 제거 가능 (requests는 이미 있음)

**API 6번(추천 문장 발화) + FE/BE/AI 연동 가이드는 별도 문서 참고:**
→ `backend/docs/api-6-fe-be-ai-integration.md`
