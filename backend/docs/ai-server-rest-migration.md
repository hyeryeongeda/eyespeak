# AI 서버 DB 직접 접근 → BE REST API 경유로 전환

## 배경

현재 AI 서버(Python)가 pymysql로 DB에 직접 접근하고 있음.
보안/유지보수를 위해 AI 서버 → BE(Spring Boot) REST API → DB 구조로 전환.

---

## BE가 만들어야 할 API 4개

### API 1. 환자 추천 컨텍스트 통합 조회

AI 서버가 추천할 때 매번 호출하는 핵심 API.

- **URL:** `GET /api/v1/ai/user-context/{matchingId}`
- **용도:** AI 서버의 `_load_user_data_from_db()` 대체
- **조회 테이블:** expressions, usage_log, expression_keywords, user_words, daily_mood, routine_slot_tag, time_slot, activity_tag

```json
// Response 예시
{
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
```

**참고 (현재 AI 서버 SQL):**
- expressions + usage_log JOIN으로 usageCount 계산
- expression_keywords에서 키워드 가져오기 (GROUP_CONCAT)
- user_words에서 JSON 파싱 (subjects/objects/verbs)
- daily_mood에서 오늘 기분 조회
- routine_slot_tag + time_slot + activity_tag JOIN으로 오늘 일정
- usage_log + expressions JOIN으로 오늘 가장 많이 쓴 표현 / 마지막 사용 표현

**wordLists 기본값 (user_words 데이터 없을 때):**
```json
{
  "subjects": ["나", "우리", "손녀딸", "딸", "여보"],
  "objects": ["물", "음식", "약"],
  "verbs": ["먹다", "마시다", "보다", "좋아하다"],
  "punctuation": [".", "!", "?"]
}
```

---

### API 2. 범용 말뭉치 전체 조회

AI 서버 기동 시 1회 호출. 이후 메모리에 캐시.

- **URL:** `GET /api/v1/ai/general-corpus`
- **용도:** AI 서버의 `_load_general_db_from_db()` 대체
- **조회 테이블:** general_corpus

```json
// Response 예시
[
  { "content": "응, 재밌었어", "sentiment": "POSITIVE", "weight": 1.0 },
  { "content": "별로야", "sentiment": "NEGATIVE", "weight": 1.0 },
  { "content": "물 좀 줘", "sentiment": "NEUTRAL", "weight": 1.0 }
]
```

**참고:** 현재 general_corpus 테이블에 약 1200행 있음. 전체 조회.

---

### API 3. 표현 사용 기록 저장

환자가 채팅에서 문장을 선택/입력했을 때 호출.

- **URL:** `POST /api/v1/ai/expressions/use`
- **용도:** AI 서버의 `/expressions/use` 내 DB INSERT 로직 대체
- **쓰기 테이블:** expressions, expression_keywords, usage_log

```json
// Request
{
  "matchingId": 1,
  "text": "물 좀 줘",
  "isNew": true,
  "sentiment": "NEUTRAL",
  "category": "영양/수분",
  "keywords": ["물", "주다"]
}

// Response
{
  "exprId": 1,
  "isNew": false
}
```

**BE가 해야 할 로직:**
1. expressions에서 `matching_id + content`로 기존 표현 확인
2. 있으면 → `last_used = NOW()` 업데이트, `isNew: false` 반환
3. 없으면 → expressions INSERT + expression_keywords INSERT, `isNew: true` 반환
4. usage_log INSERT (time_slot_id는 현재 시각 기준 자동 계산)

**중요:** sentiment, category, keywords는 AI 서버가 분류해서 보내줌. BE는 받은 그대로 저장만 하면 됨.

---

### API 4. 카테고리 힌트 조회

카테고리 카드에 표시할 힌트 데이터.

- **URL:** `GET /api/v1/ai/hints/{matchingId}`
- **용도:** AI 서버의 `/recommend/hints` 내 DB 조회 로직 대체
- **조회 테이블:** daily_mood, routine_slot_tag, time_slot, activity_tag, usage_log, expressions

```json
// Response 예시
{
  "moodHint": "기분 좋음",
  "scheduleHint": "경관식/수분 섭취",
  "frequentHint": "물 좀 줘",
  "recentHint": "고마워"
}
```

**각 필드 조회 방법:**
- `moodHint`: daily_mood에서 오늘 날짜 + matchingId로 mood_type 조회 → 한글 매핑
- `scheduleHint`: 현재 시간 → time_slot_id 계산 → routine_slot_tag + activity_tag JOIN
- `frequentHint`: usage_log + expressions JOIN → matchingId 전체 기간 → COUNT 내림차순 → 1위
- `recentHint`: usage_log + expressions JOIN → matchingId → used_at 내림차순 → 1위

**moodHint 매핑:**
```
HAPPY → "기분 좋음", SAD → "슬픔", CALM → "평온",
JOYFUL → "즐거움", ANXIOUS → "불안", ANGRY → "화남", TIRED → "피곤"
```

**시간대 → time_slot_id 매핑:**
```
06~09시 → 1, 09~12시 → 2, 12~15시 → 3,
15~18시 → 4, 18~21시 → 5, 21~24시 → 6, 00~06시 → 7
```

---

## AI 서버(예린)가 바꿀 부분

BE API가 나오면, AI 서버 `caregiver_server_db.py`에서 pymysql → requests로 4곳 수정.

### 변경 1. `_load_user_data_from_db()` (99줄)

```python
# Before: pymysql로 DB 직접 조회
def _load_user_data_from_db(matching_id):
    conn = get_db()
    # ... 약 130줄의 SQL 쿼리 ...

# After: BE API 호출
def _load_user_data_from_db(matching_id):
    resp = requests.get(f"{BE_API_URL}/ai/user-context/{matching_id}")
    if resp.status_code != 200:
        return None
    data = resp.json()["data"]
    # data를 기존 형식으로 변환
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

### 변경 2. `_load_general_db_from_db()` (232줄)

```python
# Before: pymysql로 DB 직접 조회
def _load_general_db_from_db():
    conn = get_db()
    # ...

# After: BE API 호출
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

```python
# Before: pymysql로 DB 직접 INSERT
# ... expressions INSERT, expression_keywords INSERT, usage_log INSERT ...

# After: AI가 분류 → BE API에 저장 요청
@app.route("/expressions/use", methods=["POST"])
def record_expression_use():
    data = request.json or {}
    matching_id = data.get("matching_id", 1)
    text = (data.get("text") or "").strip()

    # AI가 감정/의도 분류 + 키워드 추출 (이 부분은 AI에 남음)
    sentiment_kr, intent = _classify_sentence_for_storage(text)
    sentiment_db = SENTIMENT_MAP.get(sentiment_kr, "NEUTRAL")
    keywords = _auto_generate_keywords(text)

    # BE API에 저장 요청
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

### 변경 4. `/recommend/hints` 엔드포인트 (955줄)

```python
# Before: pymysql로 DB 직접 조회
# ... 4개 SQL 쿼리 ...

# After: BE API 호출
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
import pymysql           # 더 이상 불필요
DB_CONFIG = { ... }       # 삭제
def get_db(): ...         # 삭제

# 추가할 것
import requests
BE_API_URL = os.getenv("BE_API_URL", "http://eyespeak-backend:8080/api/v1")
```

---

## 체크리스트

### BE 담당자
- [ ] `GET /api/v1/ai/user-context/{matchingId}` 구현
- [ ] `GET /api/v1/ai/general-corpus` 구현
- [ ] `POST /api/v1/ai/expressions/use` 구현
- [ ] `GET /api/v1/ai/hints/{matchingId}` 구현
- [ ] 각 API Swagger 문서 확인

### AI 담당자 (예린)
- [ ] BE API 나오면 response 형식 확인
- [ ] `_load_user_data_from_db()` → BE API 호출로 변경
- [ ] `_load_general_db_from_db()` → BE API 호출로 변경
- [ ] `/expressions/use` → 분류는 AI에서, 저장은 BE API로 변경
- [ ] `/recommend/hints` → BE API 호출로 변경
- [ ] pymysql, DB_CONFIG, get_db() 삭제
- [ ] `import requests` + `BE_API_URL` 환경변수 추가
- [ ] AI 서버 재시작 후 전체 테스트

### 공통
- [ ] Docker 환경변수에 `BE_API_URL` 추가 (.env.ai)
- [ ] dev 서버에서 전체 흐름 테스트
