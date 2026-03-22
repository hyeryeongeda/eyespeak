# AI 서버 DB 직접 접근 → BE REST API 경유로 전환

## 배경

현재 AI 서버(Python)가 pymysql로 DB에 직접 접근하고 있음.
보안/유지보수를 위해 AI 서버 → BE(Spring Boot) REST API → DB 구조로 전환.

```
Before: AI 서버 → pymysql → DB 직접 접근
After:  AI 서버 → requests → BE(Spring Boot) → JPA → DB
```

---

## BE가 만들어야 할 API 4개

---

### API 1. 환자 추천 컨텍스트 통합 조회

AI 서버가 추천할 때 **매번** 호출하는 핵심 API. 이게 없으면 추천 자체가 안 됨.

- **URL:** `GET /api/v1/ai/user-context/{matchingId}`
- **용도:** AI 서버의 `_load_user_data_from_db()` 대체 (caregiver_server_db.py 99줄)
- **조회 테이블:** expressions, usage_log, expression_keywords, user_words, daily_mood, routine_slot_tag, time_slot, activity_tag

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

-- 쿼리 5: 오늘 가장 많이 쓴 표현 (GROUP BY + COUNT + ORDER BY)
SELECT e.content AS text, e.category, COUNT(*) AS cnt
FROM usage_log ul
JOIN expressions e ON e.id = ul.expr_id
WHERE ul.matching_id = ? AND DATE(ul.used_at) = CURDATE()
GROUP BY ul.expr_id
ORDER BY cnt DESC LIMIT 1;

-- 쿼리 6: 마지막 사용 표현 (ORDER BY + LIMIT)
SELECT e.content AS text, e.category, ul.used_at
FROM usage_log ul
JOIN expressions e ON e.id = ul.expr_id
WHERE ul.matching_id = ?
ORDER BY ul.used_at DESC LIMIT 1;
```

#### BE가 만들어야 할 JPA 코드

```java
@GetMapping("/ai/user-context/{matchingId}")
public ApiResponse<UserContextResponse> getUserContext(@PathVariable Long matchingId) {

    // 쿼리 1 대체: expressions + usageCount + keywords
    // → expressionRepository.findByMatchingId(matchingId)
    // → 각 expression마다 usageLogRepository.countByExpressionId(expr.getId())
    // → expressionKeywordRepository.findByExprId(expr.getId())

    // 쿼리 2 대체: user_words
    // → userWordsRepository.findByMatchingId(matchingId)
    // → 단순 조회, JPA 자동 생성

    // 쿼리 3 대체: daily_mood
    // → dailyMoodRepository.findByMatchingIdAndMoodDate(matchingId, LocalDate.now())
    // → 단순 조회, JPA 자동 생성

    // 쿼리 4 대체: routine_slot_tag + time_slot + activity_tag
    // → routineSlotTagRepository.findByMatchingId(matchingId)
    // → JPA @ManyToOne으로 timeSlot, activityTag 자동 JOIN

    // 쿼리 5 대체: 오늘 가장 많이 쓴 표현 (커스텀 쿼리 필요)
    // → @Query 사용:
    @Query("SELECT e.content AS text, e.category AS category, COUNT(ul) AS cnt " +
           "FROM UsageLog ul JOIN ul.expression e " +
           "WHERE ul.matching.id = :matchingId AND FUNCTION('DATE', ul.usedAt) = CURRENT_DATE " +
           "GROUP BY ul.expression " +
           "ORDER BY cnt DESC")
    List<Object[]> findMostUsedToday(@Param("matchingId") Long matchingId, Pageable pageable);
    // → Pageable.ofSize(1)로 호출하면 1위만 가져옴

    // 쿼리 6 대체: 마지막 사용 표현 (커스텀 쿼리 필요)
    // → @Query 사용:
    @Query("SELECT e.content AS text, e.category AS category, ul.usedAt AS usedAt " +
           "FROM UsageLog ul JOIN ul.expression e " +
           "WHERE ul.matching.id = :matchingId " +
           "ORDER BY ul.usedAt DESC")
    List<Object[]> findLatestByMatchingId(@Param("matchingId") Long matchingId, Pageable pageable);
    // → Pageable.ofSize(1)로 호출하면 최신 1개만

    return ApiResponse.success(new UserContextResponse(...));
}
```

**쿼리 1~4:** 단순 조회라 JPA가 메서드 이름으로 자동 생성 가능
**쿼리 5~6:** GROUP BY + COUNT + ORDER BY가 필요해서 `@Query`로 직접 작성 필요

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

### API 3. 표현 사용 기록 저장

환자가 채팅에서 문장을 선택/입력했을 때 호출.

- **URL:** `POST /api/v1/ai/expressions/use`
- **용도:** AI 서버의 `/expressions/use` 내 DB INSERT 로직 대체 (caregiver_server_db.py 877줄)
- **쓰기 테이블:** expressions, expression_keywords, usage_log

#### 현재 AI 서버가 하는 SQL

```sql
-- 1. 기존 표현 확인
SELECT id FROM expressions WHERE matching_id = ? AND content = ?;

-- 2-A. 있으면: last_used만 업데이트
UPDATE expressions SET last_used = NOW() WHERE id = ?;

-- 2-B. 없으면: 새 표현 INSERT
INSERT INTO expressions (matching_id, content, sentiment, category, last_used, created_at)
VALUES (?, ?, ?, ?, NOW(), NOW());

-- 2-B 추가: 키워드 INSERT (여러 건)
INSERT INTO expression_keywords (expr_id, keyword) VALUES (?, ?);

-- 3. usage_log INSERT (항상)
INSERT INTO usage_log (matching_id, expr_id, time_slot_id, used_at)
VALUES (?, ?, ?, NOW());
```

#### BE가 만들어야 할 JPA 코드

```java
@PostMapping("/ai/expressions/use")
public ApiResponse<ExpressionUseResponse> recordExpressionUse(@RequestBody ExpressionUseRequest request) {

    // 1. 기존 표현 확인
    // → expressionRepository.findByMatchingIdAndContent(request.getMatchingId(), request.getText())

    Expression expression;
    boolean isNew;

    Optional<Expression> existing = expressionRepository
        .findByMatchingIdAndContent(request.getMatchingId(), request.getText());

    if (existing.isPresent()) {
        // 2-A. 있으면: last_used 업데이트
        expression = existing.get();
        expression.updateLastUsed(LocalDateTime.now());
        isNew = false;
    } else {
        // 2-B. 없으면: 새 표현 + 키워드 INSERT
        expression = Expression.builder()
            .matchingId(request.getMatchingId())
            .content(request.getText())
            .sentiment(request.getSentiment())     // AI가 분류해서 보내준 값
            .category(request.getCategory())       // AI가 분류해서 보내준 값
            .lastUsed(LocalDateTime.now())
            .build();
        expressionRepository.save(expression);

        // 키워드 저장 (AI가 추출해서 보내준 값)
        for (String keyword : request.getKeywords()) {
            expressionKeywordRepository.save(
                ExpressionKeyword.builder()
                    .exprId(expression.getId())
                    .keyword(keyword)
                    .build()
            );
        }
        isNew = true;
    }

    // 3. usage_log INSERT
    // → 시간대(time_slot_id)는 현재 시각 기준 자동 계산
    TimeSlot timeSlot = timeSlotRepository.findByTime(LocalTime.now()).orElseThrow();
    usageLogRepository.save(UsageLog.builder()
        .matching(matching)
        .expression(expression)
        .timeSlot(timeSlot)
        .usedAt(LocalDateTime.now())
        .build());

    return ApiResponse.success(new ExpressionUseResponse(expression.getId(), isNew));
}
```

**중요: sentiment, category, keywords는 AI 서버가 분류/추출해서 보내줌. BE는 받은 그대로 저장만 하면 됨.**

#### Request 형식

```json
{
  "matchingId": 1,
  "text": "물 좀 줘",
  "sentiment": "NEUTRAL",
  "category": "영양/수분",
  "keywords": ["물", "주다"]
}
```

#### Response 형식

```json
{
  "code": "CREATED",
  "data": {
    "exprId": 1,
    "isNew": false
  }
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

### API 4. 카테고리 힌트 조회

카테고리 카드에 표시할 힌트 데이터.

- **URL:** `GET /api/v1/ai/hints/{matchingId}`
- **용도:** AI 서버의 `/recommend/hints` 내 DB 조회 로직 대체 (caregiver_server_db.py 955줄)
- **조회 테이블:** daily_mood, routine_slot_tag, time_slot, activity_tag, usage_log, expressions

#### 현재 AI 서버가 하는 SQL 쿼리 4개

```sql
-- 1. moodHint: 오늘의 기분
SELECT mood_type FROM daily_mood
WHERE matching_id = ? AND mood_date = CURDATE();

-- 2. scheduleHint: 현재 시간대 활동
SELECT at.name AS activity
FROM routine_slot_tag rst
JOIN activity_tag at ON at.id = rst.activity_tag_id
WHERE rst.matching_id = ? AND rst.time_slot_id = ?
LIMIT 1;

-- 3. frequentHint: 가장 많이 쓴 표현 (GROUP BY + COUNT, 커스텀 쿼리 필요)
SELECT e.content AS text, COUNT(*) AS cnt
FROM usage_log ul
JOIN expressions e ON e.id = ul.expr_id
WHERE ul.matching_id = ?
GROUP BY ul.expr_id
ORDER BY cnt DESC LIMIT 1;

-- 4. recentHint: 가장 최근 사용한 표현 (ORDER BY + LIMIT, 커스텀 쿼리 필요)
SELECT e.content AS text
FROM usage_log ul
JOIN expressions e ON e.id = ul.expr_id
WHERE ul.matching_id = ?
ORDER BY ul.used_at DESC LIMIT 1;
```

#### BE가 만들어야 할 JPA 코드

```java
@GetMapping("/ai/hints/{matchingId}")
public ApiResponse<HintsResponse> getHints(@PathVariable Long matchingId) {

    // 1. moodHint: 단순 조회, JPA 자동 생성
    // → dailyMoodRepository.findByMatchingIdAndMoodDate(matchingId, LocalDate.now())
    // → mood_type을 한글로 매핑

    // 2. scheduleHint: 현재 시간 → time_slot_id 계산 → 단순 조회
    // → routineSlotTagRepository.findByMatchingIdAndTimeSlotId(matchingId, slotId)

    // 3. frequentHint: 커스텀 쿼리 필요 (API 1의 쿼리 5와 유사)
    @Query("SELECT e.content FROM UsageLog ul JOIN ul.expression e " +
           "WHERE ul.matching.id = :matchingId " +
           "GROUP BY ul.expression ORDER BY COUNT(ul) DESC")
    List<String> findMostFrequentExpression(@Param("matchingId") Long matchingId, Pageable pageable);
    // → Pageable.ofSize(1)

    // 4. recentHint: 커스텀 쿼리 필요 (API 1의 쿼리 6과 유사)
    @Query("SELECT e.content FROM UsageLog ul JOIN ul.expression e " +
           "WHERE ul.matching.id = :matchingId " +
           "ORDER BY ul.usedAt DESC")
    List<String> findMostRecentExpression(@Param("matchingId") Long matchingId, Pageable pageable);
    // → Pageable.ofSize(1)

    return ApiResponse.success(new HintsResponse(moodHint, scheduleHint, frequentHint, recentHint));
}
```

**쿼리 1~2:** 단순 조회, JPA 자동 생성
**쿼리 3~4:** GROUP BY / ORDER BY 필요, `@Query` 직접 작성

**참고:** 쿼리 3, 4는 API 1의 쿼리 5, 6과 거의 같음. 같은 Repository 메서드 재활용 가능.

#### Response 형식

```json
{
  "code": "SUCCESS",
  "data": {
    "moodHint": "기분 좋음",
    "scheduleHint": "경관식/수분 섭취",
    "frequentHint": "물 좀 줘",
    "recentHint": "고마워"
  }
}
```

**모든 필드 null 가능** (데이터 없을 때). AI 서버가 null이면 기본값 처리함.

#### moodHint 매핑 (BE에서 변환)

```
HAPPY → "기분 좋음", SAD → "슬픔", CALM → "평온",
JOYFUL → "즐거움", ANXIOUS → "불안", ANGRY → "화남", TIRED → "피곤"
```

---

## AI 서버(예린)가 바꿀 부분

BE API가 나오면, AI 서버 `caregiver_server_db.py`에서 pymysql → requests로 4곳 수정.

### 변경 1. `_load_user_data_from_db()` (99줄, 약 130줄 → 15줄)

```python
# Before: pymysql로 DB 직접 조회 (SQL 쿼리 6개, 130줄)
def _load_user_data_from_db(matching_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT ... FROM expressions e LEFT JOIN usage_log ...")
            cur.execute("SELECT subjects, objects, verbs FROM user_words ...")
            cur.execute("SELECT mood_type FROM daily_mood ...")
            cur.execute("SELECT ts.name, at.name FROM routine_slot_tag ...")
            cur.execute("SELECT e.content, COUNT(*) FROM usage_log ... GROUP BY ...")
            cur.execute("SELECT e.content, ul.used_at FROM usage_log ... ORDER BY ...")
        return { "today_data": ..., "user_db": ..., "word_lists": ..., "word_usage_freq": ... }
    finally:
        conn.close()

# After: BE API 호출 1번 (15줄)
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

### 변경 2. `_load_general_db_from_db()` (232줄, 약 18줄 → 12줄)

```python
# Before: pymysql로 DB 직접 조회
def _load_general_db_from_db():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT content, sentiment, weight FROM general_corpus")
            rows = cur.fetchall()
        return [{"text": row["content"], ...} for row in rows]
    finally:
        conn.close()

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

### 변경 3. `/expressions/use` 엔드포인트 (877줄)

AI가 하는 일 중 **분류/추출은 AI에 남고**, **DB 저장만 BE로** 넘김.

```python
# Before: AI가 분류 + DB 직접 INSERT
@app.route("/expressions/use", methods=["POST"])
def record_expression_use():
    # AI가 감정/의도 분류
    sentiment_kr, intent = _classify_sentence_for_storage(text)
    # AI가 키워드 추출
    new_keywords = _auto_generate_keywords(text)
    # pymysql로 직접 INSERT (expressions, expression_keywords, usage_log)
    conn = get_db()
    cur.execute("INSERT INTO expressions ...")
    cur.execute("INSERT INTO expression_keywords ...")
    cur.execute("INSERT INTO usage_log ...")
    conn.commit()

# After: AI가 분류 + BE API에 저장 요청
@app.route("/expressions/use", methods=["POST"])
def record_expression_use():
    data = request.json or {}
    matching_id = data.get("matching_id", 1)
    text = (data.get("text") or "").strip()

    # AI가 감정/의도 분류 (이 부분은 AI에 남음 — LLM/키워드 기반 분류)
    sentiment_kr, intent = _classify_sentence_for_storage(text)
    sentiment_db = SENTIMENT_MAP.get(sentiment_kr, "NEUTRAL")

    # AI가 키워드 추출 (이 부분도 AI에 남음 — 형태소 분석)
    keywords = _auto_generate_keywords(text)

    # BE API에 저장 요청 (DB INSERT는 BE가 함)
    resp = requests.post(f"{BE_API_URL}/ai/expressions/use", json={
        "matchingId": matching_id,
        "text": text,
        "sentiment": sentiment_db,
        "category": intent,
        "keywords": keywords,
    })
    result = resp.json()["data"]

    # 추천 지표 업데이트 (이 부분은 AI에 남음)
    _recommend_stats["expression_use_total"] += 1
    # ... 기존 지표 로직 ...

    return jsonify({"ok": True, "exprId": result["exprId"]})
```

### 변경 4. `/recommend/hints` 엔드포인트 (955줄, 약 80줄 → 10줄)

```python
# Before: pymysql로 DB 직접 조회 (SQL 쿼리 4개, 80줄)
@app.route("/recommend/hints", methods=["POST"])
def recommend_hints():
    conn = get_db()
    cur.execute("SELECT mood_type FROM daily_mood ...")
    cur.execute("SELECT at.name FROM routine_slot_tag rst JOIN ...")
    cur.execute("SELECT e.content, COUNT(*) FROM usage_log ul JOIN ...")
    cur.execute("SELECT e.content FROM usage_log ul JOIN ...")
    conn.close()
    return jsonify({...})

# After: BE API 호출 1번 (10줄)
@app.route("/recommend/hints", methods=["POST"])
def recommend_hints():
    data = request.json or {}
    matching_id = data.get("matching_id", 1)

    resp = requests.get(f"{BE_API_URL}/ai/hints/{matching_id}")
    hints = resp.json()["data"]

    return jsonify({
        "mood_hint": hints.get("moodHint"),
        "schedule_hint": hints.get("scheduleHint"),
        "frequent_hint": hints.get("frequentHint"),
        "recent_hint": hints.get("recentHint"),
    })
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

### BE 담당자
- [ ] `GET /api/v1/ai/user-context/{matchingId}` 구현 (쿼리 6개, 커스텀 쿼리 2개)
- [ ] `GET /api/v1/ai/general-corpus` 구현 (findAll 1개)
- [ ] `POST /api/v1/ai/expressions/use` 구현 (INSERT/UPDATE 로직)
- [ ] `GET /api/v1/ai/hints/{matchingId}` 구현 (쿼리 4개, 커스텀 쿼리 2개)
- [ ] 각 API Swagger 문서 확인
- [ ] API 1, 4의 커스텀 쿼리(@Query)는 같은 Repository 메서드 재활용 가능

### AI 담당자 (예린)
- [ ] BE API 나오면 response 형식 확인
- [ ] `_load_user_data_from_db()` → BE API 호출로 변경 (130줄 → 15줄)
- [ ] `_load_general_db_from_db()` → BE API 호출로 변경 (18줄 → 12줄)
- [ ] `/expressions/use` → 분류는 AI에서, 저장은 BE API로 변경
- [ ] `/recommend/hints` → BE API 호출로 변경 (80줄 → 10줄)
- [ ] pymysql, DB_CONFIG, get_db() 삭제
- [ ] `import requests` + `BE_API_URL` 환경변수 추가
- [ ] AI 서버 재시작 후 전체 테스트

### 공통
- [ ] Docker 환경변수에 `BE_API_URL` 추가 (.env.ai)
- [ ] dev 서버에서 전체 흐름 테스트
- [ ] AI 서버 Dockerfile에서 pymysql 의존성 제거 가능 (requests는 이미 있음)
