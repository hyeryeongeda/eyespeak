# eyespeak 추천 로직 개선 - Jira Sprint 계획서 (7인 팀 버전) 🎯

**프로젝트명**: eyespeak 추천 시스템 개선  
**프로젝트 기간**: 2025년 3월 15일(금) ~ 3월 27일(목) (12일)  
**작업일**: 10일 (주말 제외)



## 🏗️ Epic 구조

```
Epic 1: 개발 환경 검증 (5 SP)
Epic 2: 실시간 통계 시스템 (8 SP)
Epic 3: 성능 최적화 (8 SP)
Epic 4: 추천 알고리즘 고도화 (8 SP)
Epic 5: 프론트엔드 개선 (5 SP)
Epic 6: 품질 보증 (8 SP)
Epic 7: 모바일 연동 (5 SP)
Epic 8: 문서화 & 배포 (8 SP)

총 Story Points: 55 SP (7명 × 10일 = 70 SP 가능, 여유 있음)
```

---

## 📅 Sprint 1: 핵심 기능 개발 (3/17 ~ 3/21, 5일)

**Sprint 목표**: 실시간 통계 + 추천 고도화 + 성능 최적화  
**총 Story Points**: 35 SP  
**Velocity**: 7 SP/일

---

### 📆 Day 1 (3/17 월) - 환경 설정 & 계획

**Daily Standup 주제**: 개발 환경 확인 및 역할 분담

---

#### Epic 1: 개발 환경 검증

**Story 1.1: konlpy 설치 및 검증**  
- **Story Points**: 3  
- **우선순위**: P0 - Critical  
- **담당자**: AI-2  
- **라벨**: `environment`, `AI`

**Tasks**:
```
□ Task 1.1.1: konlpy 설치 테스트 (AI-2, 1h)
  - Mac/Linux 환경 설치
  - pip install konlpy
  - Java 의존성 확인

□ Task 1.1.2: Okt 형태소 분석 테스트 (AI-2, 1h)
  테스트 케이스:
  - "먹고 싶어" → ["먹", "고", "싶", "어"]
  - "저녁 먹을래?" → ["저녁", "먹", "을", "래", "?"]

□ Task 1.1.3: 단어 추천 정확도 비교 (AI-2, 2h)
  질문: "저녁 먹을래?"
  - konlpy 없음: verbs 추천 6개
  - konlpy 있음: verbs 추천 6개
  → 정확도 차이 측정 (예: 일치율 80% vs 95%)

□ Task 1.1.4: 설치 가이드 문서 작성 (AI-2, 1h)
  README.md에 섹션 추가:
  ## konlpy 설치 (선택)
  ### Mac
  brew install openjdk@11
  pip install konlpy
  
  ### Linux (Ubuntu)
  sudo apt-get install openjdk-11-jdk
  pip install konlpy
  
  ### 검증
  python -c "from konlpy.tag import Okt; print(Okt().pos('테스트'))"
```

**완료 조건**:
- [ ] konlpy 설치 성공/실패 결과 문서화
- [ ] 정확도 비교 리포트 (간단한 표)
- [ ] README.md 업데이트
- [ ] 코드 리뷰 완료

---

**Story 1.2: 성능 측정 기준선 수립**  
- **Story Points**: 2  
- **우선순위**: P0 - Critical  
- **담당자**: BE-2  
- **라벨**: `performance`, `backend`

**Tasks**:
```
□ Task 1.2.1: API 응답 시간 측정 데코레이터 추가 (BE-2, 2h)
  파일: caregiver_server.py
  
  import time
  from functools import wraps
  
  # 성능 통계 저장
  performance_stats = []
  
  def measure_time(func):
      @wraps(func)
      def wrapper(*args, **kwargs):
          start = time.time()
          result = func(*args, **kwargs)
          duration = (time.time() - start) * 1000
          
          # 로그 저장
          performance_stats.append({
              'function': func.__name__,
              'duration_ms': round(duration, 2),
              'timestamp': datetime.now().isoformat()
          })
          
          print(f"[PERF] {func.__name__}: {duration:.2f}ms")
          return result
      return wrapper
  
  # 적용
  @app.route("/recommend", methods=["POST"])
  @measure_time
  def recommend():
      ...

□ Task 1.2.2: 서버 시작 시간 측정 (BE-2, 1h)
  startup_start = time.time()
  # ... 모든 초기화
  startup_duration = time.time() - startup_start
  print(f"[STARTUP] 서버 시작 완료: {startup_duration:.2f}초")

□ Task 1.2.3: 임베딩 캐시 히트율 측정 (BE-2, 1h)
  cache_stats = {"hits": 0, "misses": 0}
  
  def get_embedding(text):
      if text in embedding_cache:
          cache_stats["hits"] += 1
          return embedding_cache[text]
      else:
          cache_stats["misses"] += 1
          emb = embed_model.encode(text, convert_to_numpy=True)
          embedding_cache[text] = emb
          return emb

□ Task 1.2.4: 성능 리포트 자동 생성 (BE-2, 2h)
  파일: scripts/generate_performance_report.py
  
  import json
  import csv
  
  # performance_stats → CSV
  with open('performance_log.csv', 'w') as f:
      writer = csv.DictWriter(f, fieldnames=['function', 'duration_ms', 'timestamp'])
      writer.writeheader()
      writer.writerows(performance_stats)
  
  # baseline 문서 생성
  with open('baseline_performance.md', 'w') as f:
      f.write(f"# Performance Baseline\n")
      f.write(f"서버 시작: {startup_duration}초\n")
      f.write(f"캐시 히트율: {cache_stats['hits'] / (cache_stats['hits'] + cache_stats['misses']) * 100:.1f}%\n")
```

**완료 조건**:
- [ ] 모든 API에 @measure_time 데코레이터 적용
- [ ] performance_log.csv 자동 생성
- [ ] baseline_performance.md 문서 작성
- [ ] 코드 리뷰 완료

---

### 📆 Day 2 (3/18 화) - 실시간 통계 개발

**Daily Standup 주제**: todayData 실시간 계산 로직 설계

---

#### Epic 2: 실시간 통계 시스템

**Story 2.1: todayData 실시간 계산 구현**  
- **Story Points**: 8  
- **우선순위**: P0 - Critical  
- **담당자**: BE-1 (리드), BE-3 (지원)  
- **라벨**: `feature`, `backend`, `realtime`

**Tasks**:

```
□ Task 2.1.1: 사용 기록 저장 로직 강화 (BE-1, 3h)
  파일: caregiver_server.py
  
  # 메모리 기반 사용 로그 (추후 MySQL로 전환)
  usage_logs = {}  # {user_id: [logs]}
  
  @app.route("/expressions/use", methods=["POST"])
  def record_expression_use():
      data = request.get_json()
      user_id = data.get("user_id", DEFAULT_USER_ID)
      text = data.get("text", "")
      sentiment = data.get("sentiment", "중립")
      feature_type = data.get("feature_type", "sentence")  # NEW
      
      now = datetime.now()
      
      # 1. 사용 로그 저장
      if user_id not in usage_logs:
          usage_logs[user_id] = []
      
      usage_logs[user_id].append({
          "text": text,
          "sentiment": sentiment,
          "feature_type": feature_type,
          "hour": now.hour,
          "created_at": now.isoformat()
      })
      
      # 2. 기존 JSON 업데이트 (유지)
      _update_user_json(user_id, text, sentiment)
      
      # 3. 시간대별 통계 업데이트
      _update_hourly_stats(user_id, text, now.hour)
      
      # 4. 캐시 무효화
      _invalidate_user_cache(user_id)
      
      return jsonify({
          "ok": True,
          "message": "expression recorded",
          "timestamp": now.isoformat()
      })

□ Task 2.1.2: 시간대별 통계 계산 (BE-1, 2h)
  # 시간대별 표현 카운트 (메모리)
  hourly_stats = {}  # {user_id: {hour: {text: count}}}
  
  def _update_hourly_stats(user_id: str, text: str, hour: int):
      """시간대별 표현 사용 빈도 업데이트"""
      if user_id not in hourly_stats:
          hourly_stats[user_id] = {}
      
      if hour not in hourly_stats[user_id]:
          hourly_stats[user_id][hour] = {}
      
      if text not in hourly_stats[user_id][hour]:
          hourly_stats[user_id][hour][text] = 0
      
      hourly_stats[user_id][hour][text] += 1

□ Task 2.1.3: todayData 실시간 계산 함수 (BE-1, 3h)
  def _calculate_today_data(user_id: str) -> dict:
      """오늘 데이터 실시간 계산"""
      now = datetime.now()
      today = now.date()
      current_hour = now.hour
      
      # 1. 오늘 사용 로그 필터링
      if user_id not in usage_logs:
          return _get_default_today_data()
      
      today_logs = [
          log for log in usage_logs[user_id]
          if datetime.fromisoformat(log["created_at"]).date() == today
      ]
      
      if not today_logs:
          return _get_default_today_data()
      
      # 2. 가장 많이 사용한 표현 (오늘)
      from collections import Counter
      expression_counter = Counter([log["text"] for log in today_logs])
      most_used = expression_counter.most_common(1)[0] if expression_counter else ("", 0)
      
      # 3. 가장 최근 사용한 기능
      last_log = max(today_logs, key=lambda x: x["created_at"])
      
      # 4. 현재 시간대에 자주 사용한 문장 Top 3
      hourly_expressions = []
      if user_id in hourly_stats and current_hour in hourly_stats[user_id]:
          hour_data = hourly_stats[user_id][current_hour]
          hourly_expressions = [
              {"text": text, "count": count}
              for text, count in sorted(hour_data.items(), key=lambda x: x[1], reverse=True)[:3]
          ]
      
      # 5. 기분 분석 (sentiment 기반)
      sentiments = [log["sentiment"] for log in today_logs]
      positive_count = sentiments.count("긍정")
      negative_count = sentiments.count("부정")
      
      if positive_count > negative_count:
          mood = "행복"
      elif negative_count > positive_count:
          mood = "불편"
      else:
          mood = "중립"
      
      return {
          "mood": mood,
          "schedule": [],  # 추후 확장
          "mostUsedToday": {
              "expression": most_used[0],
              "count": most_used[1]
          },
          "lastUsedFeature": {
              "expression": last_log["text"],
              "feature_type": last_log["feature_type"],
              "time": datetime.fromisoformat(last_log["created_at"]).strftime("%H:%M")
          },
          "hourlyFrequent": hourly_expressions
      }
  
  def _get_default_today_data():
      """기본 todayData (사용 기록 없을 때)"""
      return {
          "mood": "중립",
          "schedule": [],
          "mostUsedToday": {"expression": "", "count": 0},
          "lastUsedFeature": {"expression": "", "feature_type": "", "time": ""},
          "hourlyFrequent": []
      }

□ Task 2.1.4: GET /today API 수정 (BE-1, 1h)
  @app.route("/today", methods=["GET"])
  def get_today():
      user_id = request.args.get("user_id", DEFAULT_USER_ID)
      
      # 실시간 계산
      today_data = _calculate_today_data(user_id)
      
      return jsonify(today_data)

□ Task 2.1.5: 프론트엔드 연동 테스트 (BE-3, 2h)
  - Postman으로 POST /expressions/use 10회 호출
  - GET /today 호출하여 통계 확인
  - mostUsedToday, lastUsedFeature 정확성 검증
```

**완료 조건**:
- [ ] POST /expressions/use가 feature_type 저장
- [ ] GET /today가 실시간 데이터 반환
- [ ] mostUsedToday 정확히 계산됨
- [ ] hourlyFrequent Top 3 정확함
- [ ] 코드 리뷰 완료

---

### 📆 Day 3 (3/19 수) - 성능 최적화 & AI 개선

**Daily Standup 주제**: 병렬 작업 - 성능 vs 추천 알고리즘

---

#### Epic 3: 성능 최적화

**Story 3.1: 서버 시작 시간 단축**  
- **Story Points**: 5  
- **우선순위**: P1 - High  
- **담당자**: BE-2  
- **라벨**: `performance`, `backend`

**Tasks**:

```
□ Task 3.1.1: 임베딩 사전 계산 병렬화 (BE-2, 3h)
  from concurrent.futures import ThreadPoolExecutor
  
  def precompute_embeddings_parallel():
      all_texts = [item["text"] for item in general_db]
      print(f"[초기화] 임베딩 병렬 계산 중: {len(all_texts)}개")
      
      # 4개 스레드로 병렬 처리
      with ThreadPoolExecutor(max_workers=4) as executor:
          list(executor.map(get_embedding, all_texts))
      
      print("[초기화] 완료")
  
  # 기존 함수 교체
  # precompute_embeddings() → precompute_embeddings_parallel()

□ Task 3.1.2: 임베딩 캐시 파일 저장/로드 (BE-2, 3h)
  import numpy as np
  
  CACHE_FILE = DATA_DIR / "embeddings_cache.npz"
  
  def save_embeddings():
      """임베딩 캐시를 파일로 저장"""
      if not embedding_cache:
          return
      
      texts = list(embedding_cache.keys())
      embeddings = np.array([embedding_cache[t] for t in texts])
      
      np.savez_compressed(
          CACHE_FILE,
          texts=texts,
          embeddings=embeddings
      )
      print(f"[저장] 임베딩 {len(texts)}개 저장 완료")
  
  def load_embeddings():
      """저장된 임베딩 캐시 로드"""
      if not CACHE_FILE.exists():
          print("[로드] 캐시 파일 없음 → 새로 생성")
          return False
      
      data = np.load(CACHE_FILE, allow_pickle=True)
      texts = data['texts']
      embeddings = data['embeddings']
      
      for text, emb in zip(texts, embeddings):
          embedding_cache[text] = emb
      
      print(f"[로드] 임베딩 {len(texts)}개 로드 완료")
      return True
  
  # 서버 시작 시
  if load_embeddings():
      print("[초기화] 캐시 로드 완료 → 사전 계산 생략")
  else:
      print("[초기화] 캐시 없음 → 병렬 계산 시작")
      precompute_embeddings_parallel()
      save_embeddings()

□ Task 3.1.3: 성능 비교 측정 (BE-2, 1h)
  테스트:
  1. embeddings_cache.npz 삭제
  2. python caregiver_server.py 실행 → 시간 측정
  3. 다시 실행 (캐시 있음) → 시간 측정
  
  목표:
  - 첫 실행: < 3초 (병렬화 효과)
  - 캐시 로드: < 1초
```

**완료 조건**:
- [ ] 서버 시작 시간 < 2.0초
- [ ] embeddings_cache.npz 자동 생성
- [ ] 성능 비교 문서 업데이트
- [ ] 코드 리뷰 완료

---

#### Epic 4: 추천 알고리즘 고도화 (병렬 작업)

**Story 4.1: MMR 다양성 보장**  
- **Story Points**: 5  
- **우선순위**: P1 - High  
- **담당자**: AI-1  
- **라벨**: `AI`, `algorithm`

**Tasks**:

```
□ Task 4.1.1: MMR 알고리즘 구현 (AI-1, 3h)
  파일: caregiver_server.py
  
  def _apply_mmr(candidates: list, k: int = 3, lambda_param: float = 0.7) -> list:
      """
      MMR (Maximal Marginal Relevance): 관련성과 다양성의 균형
      
      Args:
          candidates: 검색 결과 [{"text": ..., "score": ...}]
          k: 최종 선택 개수
          lambda_param: 관련성 가중치 (0.7 = 관련성 70%, 다양성 30%)
      
      Returns:
          다양성이 보장된 k개 결과
      """
      if not candidates or k == 0:
          return []
      
      # 1순위는 무조건 선택 (가장 관련성 높음)
      selected = [candidates[0]]
      remaining = candidates[1:]
      
      while len(selected) < k and remaining:
          best_score = -float('inf')
          best_idx = 0
          
          for i, cand in enumerate(remaining):
              # 관련성 점수
              relevance = cand["score"]
              
              # 이미 선택된 것과의 최대 유사도
              max_similarity = max(
                  cosine_sim(
                      get_embedding(cand["text"]),
                      get_embedding(s["text"])
                  )
                  for s in selected
              )
              
              # MMR 점수 = λ×관련성 - (1-λ)×유사도
              mmr_score = (lambda_param * relevance) - ((1 - lambda_param) * max_similarity)
              
              if mmr_score > best_score:
                  best_score = mmr_score
                  best_idx = i
          
          selected.append(remaining.pop(best_idx))
      
      return selected

□ Task 4.1.2: _search_sentences()에 MMR 적용 (AI-1, 2h)
  def _search_sentences_with_mmr(question, user_db, sentiment_filter, k=5):
      # 1. 기존 검색으로 k*2개 후보 확보
      candidates = _search_sentences(question, user_db, sentiment_filter, k=k*2)
      
      # 2. MMR로 다양성 보장하며 k개 선택
      diverse_results = _apply_mmr(candidates, k=k, lambda_param=0.7)
      
      return diverse_results
  
  # recommend() 함수 수정
  @app.route("/recommend", methods=["POST"])
  def recommend():
      # ...
      # 기존: candidates = _search_sentences(...)
      # 변경: candidates = _search_sentences_with_mmr(...)
      candidates = _search_sentences_with_mmr(question, combined_db, sentiment_filter, k=5)
      # ...

□ Task 4.1.3: A/B 테스트 데이터 수집 (AI-1, 2h)
  테스트 질문 10개:
  1. "저녁 먹을래?"
  2. "오늘 기분 어때?"
  3. "물 좀 줘"
  ...
  
  각 질문에 대해:
  - 기존 방식 (MMR 없음) → 추천 3개
  - MMR 방식 → 추천 3개
  
  다양성 측정:
  - 3개 문장 간 평균 유사도 계산
  - MMR이 더 낮으면 성공 (다양성 ↑)

□ Task 4.1.4: 성능 문서 작성 (AI-1, 1h)
  파일: docs/MMR_EVALUATION.md
  
  # MMR 알고리즘 평가
  
  ## 테스트 결과
  질문: "저녁 먹을래?"
  
  ### 기존 방식
  1. "저녁 안 먹을래"
  2. "저녁 먹기 싫어"  
  3. "저녁 별로야"
  → 평균 유사도: 0.82 (너무 비슷함)
  
  ### MMR 방식
  1. "저녁 안 먹을래"
  2. "배 안 고파"
  3. "괜찮아"
  → 평균 유사도: 0.58 (다양함)
```

**완료 조건**:
- [ ] MMR 알고리즘 구현 완료
- [ ] _search_sentences_with_mmr() 작동
- [ ] A/B 테스트 결과 문서화
- [ ] 코드 리뷰 완료

---

**Story 4.2: LLM 프롬프트 최적화 (병렬 작업)**  
- **Story Points**: 3  
- **우선순위**: P2 - Medium  
- **담당자**: AI-2  
- **라벨**: `AI`, `LLM`

**Tasks**:

```
□ Task 4.2.1: 문장 정제 프롬프트 개선 (AI-2, 2h)
  # Few-shot 예시 추가
  def _refine_recommend(question, candidates, sentiment_context):
      examples = """
예시 1:
질문: "저녁 먹을래?"
후보: ["배 고파", "밥 먹고 싶어", "식사 시간이야"]
출력:
배 안 고파
조금 있다 먹을래
괜찮아

예시 2:
질문: "오늘 기분 어때?"
후보: ["행복해", "좋아", "기분 좋네"]
출력:
오늘 기분 좋아
행복해
그저그래
"""
      
      prompt = f"""{examples}

이제 실제 질문을 처리하세요:
질문: "{question}"
후보 표현: {[c["text"] for c in candidates]}

위 표현들을 참고해서 질문에 어울리는 자연스러운 환자 답변을 정확히 3개 만드세요.
- 보호자 질문 시제/맥락에 맞게
- 반말 구어체, 15자 이내
- {"긍정 1개, 부정/중립 2개" if not sentiment_context else "같은 방향으로 통일"}
- 번호나 기호 없이 줄바꿈으로만 구분

출력:"""
      
      # ... LLM 호출

□ Task 4.2.2: 카테고리 생성 프롬프트 개선 (AI-2, 2h)
  # 더 명확한 지시사항
  prompt = f"""보호자 질문: "{question}"

이 질문에 대한 환자의 답변 방향성을 2-4개 카테고리로 분류하세요.

규칙:
1. 카테고리는 명확한 sentiment를 나타내야 함 (긍정/부정/중립)
2. 각 카테고리는 2-4글자
3. 예/아니오 질문은 2개만
4. 선택 질문은 선택지 개수만큼
5. 기분/상태 질문은 3-4개 (긍정, 부정, 중립 포함)

출력 형식 (JSON):
{{
  "categories": ["예", "아니오"],
  "sentimentMap": {{"예": "긍정", "아니오": "부정"}}
}}

출력:"""

□ Task 4.2.3: 프롬프트 성능 비교 (AI-2, 2h)
  10개 질문으로 테스트:
  - 기존 프롬프트 → LLM 응답
  - 개선 프롬프트 → LLM 응답
  
  비교 지표:
  - 문장 길이 준수율 (15자 이내)
  - 카테고리 개수 정확도
  - 출력 형식 준수율
```

**완료 조건**:
- [ ] Few-shot 프롬프트 적용
- [ ] 성능 비교 문서 작성
- [ ] 코드 리뷰 완료

---

### 📆 Day 4 (3/20 목) - 프론트엔드 개선 & 에러 처리

**Daily Standup 주제**: 사용자 경험 개선

---

#### Epic 5: 프론트엔드 개선

**Story 5.1: UI/UX 개선**  
- **Story Points**: 5  
- **우선순위**: P1 - High  
- **담당자**: FE-1, FE-2  
- **라벨**: `frontend`, `UX`

**Tasks**:

```
□ Task 5.1.1: 로딩 상태 개선 (FE-1, 3h)
  파일: caregiver_prototype.html
  
  // 현재 진행 상태 표시
  function showLoading(message) {
      const loadingDiv = document.getElementById('loading');
      loadingDiv.innerHTML = `
          <div class="spinner"></div>
          <p>${message}</p>
      `;
      loadingDiv.style.display = 'flex';
  }
  
  // 사용
  showLoading("카테고리 생성 중...");  // POST /categories 호출 전
  showLoading("문장 추천 중...");      // POST /recommend 호출 전
  showLoading("단어 검색 중...");      // POST /words 호출 전

□ Task 5.1.2: 에러 메시지 사용자 친화적으로 개선 (FE-1, 2h)
  const ERROR_MESSAGES = {
      'network': '네트워크 연결을 확인해주세요.',
      'timeout': '응답 시간이 초과되었습니다. 다시 시도해주세요.',
      'server': '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      'llm': 'AI 응답 생성에 실패했습니다. 다시 시도해주세요.'
  };
  
  function showError(type) {
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = ERROR_MESSAGES[type] || ERROR_MESSAGES['server'];
      errorDiv.style.display = 'block';
      
      // 5초 후 자동 숨김
      setTimeout(() => {
          errorDiv.style.display = 'none';
      }, 5000);
  }

□ Task 5.1.3: 키보드 단축키 지원 (FE-2, 2h)
  document.addEventListener('keydown', (e) => {
      // Enter: 첫 번째 선택지 선택
      if (e.key === 'Enter') {
          const firstButton = document.querySelector('.choice-button');
          if (firstButton) firstButton.click();
      }
      
      // ESC: 홈으로 돌아가기
      if (e.key === 'Escape') {
          goHome();
      }
      
      // 1-9: 숫자로 선택지 선택
      if (e.key >= '1' && e.key <= '9') {
          const buttons = document.querySelectorAll('.choice-button');
          const index = parseInt(e.key) - 1;
          if (buttons[index]) buttons[index].click();
      }
  });

□ Task 5.1.4: todayData 화면 개선 (FE-2, 3h)
  function renderTodayData(data) {
      const container = document.getElementById('todayContainer');
      
      container.innerHTML = `
          <div class="today-section">
              <h3>오늘의 기분</h3>
              <div class="mood-icon">${getMoodIcon(data.mood)}</div>
              <p>${data.mood}</p>
          </div>
          
          <div class="today-section">
              <h3>가장 많이 사용한 말</h3>
              <p class="highlight">"${data.mostUsedToday.expression}"</p>
              <small>${data.mostUsedToday.count}번 사용</small>
          </div>
          
          <div class="today-section">
              <h3>가장 최근에 사용한 기능</h3>
              <p>${data.lastUsedFeature.expression}</p>
              <small>${data.lastUsedFeature.time} (${getFeatureTypeKorean(data.lastUsedFeature.feature_type)})</small>
          </div>
          
          <div class="today-section">
              <h3>지금 시간에 자주 쓰는 말</h3>
              <ul>
                  ${data.hourlyFrequent.map(item => `
                      <li>"${item.text}" (${item.count}번)</li>
                  `).join('')}
              </ul>
          </div>
      `;
  }
  
  function getMoodIcon(mood) {
      const icons = {
          '행복': '😊',
          '중립': '😐',
          '불편': '😔'
      };
      return icons[mood] || '😐';
  }
  
  function getFeatureTypeKorean(type) {
      const types = {
          'sentence': '문장 추천',
          'word': '단어 조합',
          'category': '카테고리 선택'
      };
      return types[type] || '';
  }
```

**완료 조건**:
- [ ] 로딩 메시지 표시
- [ ] 에러 메시지 개선
- [ ] 키보드 단축키 작동
- [ ] todayData UI 개선
- [ ] 코드 리뷰 완료

---

#### Epic 3 (계속): 에러 처리 강화

**Story 3.2: 서버 에러 처리 강화**  
- **Story Points**: 3  
- **우선순위**: P1 - High  
- **담당자**: BE-3  
- **라벨**: `backend`, `robustness`

**Tasks**:

```
□ Task 3.2.1: LLM API 에러 상세 로깅 (BE-3, 2h)
  def _generate_categories(question):
      # ... 기존 코드
      for attempt in range(3):
          try:
              resp = llm_client.chat.completions.create(...)
              return result
          except Exception as e:
              error_type = type(e).__name__
              error_msg = str(e)
              print(f"[LLM 에러 {attempt+1}/3] {error_type}: {error_msg}")
              
              # 재시도 대기 (지수 백오프)
              if attempt < 2:
                  wait_time = 0.5 * (2 ** attempt)
                  print(f"[재시도] {wait_time}초 후 재시도...")
                  time.sleep(wait_time)
      
      # 폴백
      print(f"[LLM 폴백] 3회 실패 → 기본 카테고리 반환")
      return {"categories": ["예", "아니오"], "sentimentMap": {"예": "긍정", "아니오": "부정"}}

□ Task 3.2.2: 사용자 파일 없을 때 샘플 자동 생성 (BE-3, 2h)
  def _load_user_data(user_id):
      path = DATA_DIR / "users" / f"{user_id}.json"
      
      if not path.exists():
          print(f"[경고] {user_id} 파일 없음 → 샘플 데이터 생성")
          _create_sample_user_data(user_id)
      
      # ... 기존 로드 로직
  
  def _create_sample_user_data(user_id):
      """기본 샘플 데이터 생성"""
      sample = {
          "todayData": {
              "mood": "중립",
              "schedule": [],
              "mostUsedToday": {"expression": "물 좀 줘", "count": 0},
              "lastUsedFeature": {"expression": "", "feature_type": "", "time": ""}
          },
          "pastExpressions": [
              {"text": "물 좀 줘", "sentiment": "중립", "usageCount": 1, "keywords": ["물"], "categories": []},
              {"text": "고마워", "sentiment": "긍정", "usageCount": 1, "keywords": [], "categories": []},
              {"text": "괜찮아", "sentiment": "중립", "usageCount": 1, "keywords": [], "categories": []}
          ],
          "pastWords": {
              "subjects": ["나", "우리", "엄마"],
              "objects": ["물", "음식", "약"],
              "verbs": ["먹다", "마시다", "쉬다", "하다"],
              "punctuation": [".", "!", "?", ",", "~", "없음"]
          }
      }
      
      path = DATA_DIR / "users" / f"{user_id}.json"
      path.parent.mkdir(parents=True, exist_ok=True)
      
      with open(path, 'w', encoding='utf-8') as f:
          json.dump(sample, f, ensure_ascii=False, indent=2)
      
      print(f"[생성] {path} 샘플 데이터 생성 완료")

□ Task 3.2.3: API 에러 응답 표준화 (BE-3, 1h)
  # 모든 에러 응답을 통일된 형식으로
  def error_response(message, code=500):
      return jsonify({
          "error": True,
          "message": message,
          "timestamp": datetime.now().isoformat()
      }), code
  
  # 사용 예시
  @app.route("/recommend", methods=["POST"])
  def recommend():
      try:
          # ... 로직
      except ValueError as e:
          return error_response(f"입력 오류: {str(e)}", 400)
      except Exception as e:
          print(f"[에러] {type(e).__name__}: {e}")
          return error_response("일시적 오류가 발생했습니다", 500)
```

**완료 조건**:
- [ ] 모든 LLM 호출에 재시도 로직
- [ ] 사용자 파일 없어도 작동
- [ ] 표준화된 에러 응답
- [ ] 코드 리뷰 완료

---

### 📆 Day 5 (3/21 금) - 테스트 & 회고

**Daily Standup 주제**: Sprint 1 마무리

---

#### Epic 6: 품질 보증

**Story 6.1: 통합 테스트 작성**  
- **Story Points**: 8  
- **우선순위**: P0 - Critical  
- **담당자**: BE-3 (리드), AI-2, FE-1  
- **라벨**: `testing`, `QA`

**Tasks**:

```
□ Task 6.1.1: pytest 환경 설정 (BE-3, 1h)
  pip install pytest pytest-flask pytest-cov
  
  # 디렉토리 구조
  tests/
  ├── __init__.py
  ├── conftest.py  # 테스트 설정
  ├── test_core.py  # 핵심 함수 테스트
  ├── test_api.py   # API 테스트
  └── test_scenarios.py  # 시나리오 테스트
  
  # conftest.py
  import pytest
  from caregiver_server import app
  
  @pytest.fixture
  def client():
      app.config['TESTING'] = True
      with app.test_client() as client:
          yield client

□ Task 6.1.2: 핵심 함수 단위 테스트 (BE-3, 3h)
  # tests/test_core.py
  import numpy as np
  from caregiver_server import cosine_sim, _calculate_temporal_boost, _get_question_tokens, _calculate_today_data
  
  def test_cosine_sim():
      """코사인 유사도 테스트"""
      a = np.array([1, 0, 0])
      b = np.array([1, 0, 0])
      assert cosine_sim(a, b) == 1.0
      
      a = np.array([1, 0, 0])
      b = np.array([0, 1, 0])
      assert cosine_sim(a, b) == 0.0
  
  def test_temporal_boost():
      """시간대 가중치 테스트"""
      item = {"lastUsed": "2025-03-20T14:30:00"}
      boost = _calculate_temporal_boost(item, 14, 3)
      assert boost == 1.2  # 같은 시간대
      
      boost = _calculate_temporal_boost(item, 15, 3)
      assert boost == 1.1  # 같은 요일
  
  def test_question_tokens():
      """질문 토큰화 테스트"""
      tokens = _get_question_tokens("저녁 먹을래?")
      assert "저녁" in tokens
      assert "먹" in tokens
  
  def test_calculate_today_data():
      """todayData 계산 테스트"""
      # 샘플 로그 주입
      from caregiver_server import usage_logs
      usage_logs["test_user"] = [
          {"text": "물 좀 줘", "sentiment": "중립", "feature_type": "sentence", "hour": 14, "created_at": "2025-03-20T14:00:00"},
          {"text": "물 좀 줘", "sentiment": "중립", "feature_type": "sentence", "hour": 14, "created_at": "2025-03-20T14:30:00"},
          {"text": "고마워", "sentiment": "긍정", "feature_type": "sentence", "hour": 15, "created_at": "2025-03-20T15:00:00"}
          ]
      
      data = _calculate_today_data("test_user")
      assert data["mostUsedToday"]["expression"] == "물 좀 줘"
      assert data["mostUsedToday"]["count"] == 2

□ Task 6.1.3: API 통합 테스트 (AI-2, 3h)
  # tests/test_api.py
  def test_get_today(client):
      """GET /today 테스트"""
      response = client.get('/today?user_id=patient_001')
      assert response.status_code == 200
      data = response.json
      assert 'mood' in data
      assert 'mostUsedToday' in data
      assert 'lastUsedFeature' in data
      assert 'hourlyFrequent' in data
  
  def test_post_categories(client):
      """POST /categories 테스트"""
      response = client.post('/categories', json={'question': '저녁 먹을래?'})
      assert response.status_code == 200
      data = response.json
      assert 'categories' in data
      assert len(data['categories']) >= 2
      assert 'sentimentMap' in data
  
  def test_post_recommend(client):
      """POST /recommend 테스트"""
      response = client.post('/recommend', json={
          'question': '저녁 먹을래?',
          'sentiment': '부정'
      })
      assert response.status_code == 200
      data = response.json
      assert 'sentences' in data
      assert len(data['sentences']) == 3
  
  def test_post_words(client):
      """POST /words 테스트"""
      response = client.post('/words', json={
          'question': '저녁 먹을래?',
          'category': 'verbs'
      })
      assert response.status_code == 200
      data = response.json
      assert 'words' in data
      assert len(data['words']) <= 6
  
  def test_post_expressions_use(client):
      """POST /expressions/use 테스트"""
      response = client.post('/expressions/use', json={
          'user_id': 'test_user',
          'text': '물 좀 줘',
          'sentiment': '중립',
          'feature_type': 'sentence'
      })
      assert response.status_code == 200
      assert response.json['ok'] == True

□ Task 6.1.4: 시나리오 테스트 (FE-1, 3h)
  # tests/test_scenarios.py
  def test_caregiver_flow(client):
      """보호자 질문 → 추천 전체 플로우"""
      # 1. 카테고리 생성
      response = client.post('/categories', json={'question': '저녁 먹을래?'})
      categories = response.json['categories']
      sentiment_map = response.json['sentimentMap']
      
      # 2. 카테고리 선택 (부정)
      negative_cat = [c for c, s in sentiment_map.items() if s == '부정'][0]
      
      # 3. 문장 추천
      response = client.post('/recommend', json={
          'question': '저녁 먹을래?',
          'sentiment': '부정'
      })
      sentences = response.json['sentences']
      assert len(sentences) == 3
      
      # 4. 문장 선택 및 사용 기록
      selected = sentences[0]
      response = client.post('/expressions/use', json={
          'text': selected,
          'sentiment': '부정'
      })
      assert response.json['ok'] == True
  
  def test_word_mode_flow(client):
      """단어 조합 모드 플로우"""
      question = "물 마시고 싶어"
      
      # 1. 주어
      response = client.post('/words', json={'question': question, 'category': 'subjects'})
      assert len(response.json['words']) > 0
      
      # 2. 목적어
      response = client.post('/words', json={'question': question, 'category': 'objects'})
      assert len(response.json['words']) > 0
      
      # 3. 서술어
      response = client.post('/words', json={'question': question, 'category': 'verbs'})
      assert len(response.json['words']) > 0
      
      # 4. 문장 생성
      response = client.post('/generate', json={
          'words': ['나', '물', '마시다', '.'],
          'question': question
      })
      assert len(response.json['sentences']) == 3
  
  def test_today_data_realtime_update(client):
      """todayData 실시간 업데이트 테스트"""
      # 1. 초기 todayData
      response = client.get('/today?user_id=test_user_realtime')
      initial_count = response.json['mostUsedToday']['count']
      
      # 2. 표현 3회 사용
      for _ in range(3):
          client.post('/expressions/use', json={
              'user_id': 'test_user_realtime',
              'text': '테스트 문장',
              'sentiment': '중립',
              'feature_type': 'sentence'
          })
      
      # 3. todayData 재조회
      response = client.get('/today?user_id=test_user_realtime')
      assert response.json['mostUsedToday']['expression'] == '테스트 문장'
      assert response.json['mostUsedToday']['count'] == 3

□ Task 6.1.5: 테스트 실행 및 커버리지 측정 (BE-3, 1h)
  # 테스트 실행
  pytest tests/ -v
  
  # 커버리지 측정
  pytest tests/ --cov=caregiver_server --cov-report=html
  
  # 목표: 커버리지 > 60%
```

**완료 조건**:
- [ ] pytest 실행 가능
- [ ] 모든 테스트 통과
- [ ] 테스트 커버리지 > 60%
- [ ] coverage_html 리포트 생성

---

**오후 - Sprint 1 회고 (전체 팀, 2h)**

```
회고 형식: Start-Stop-Continue

□ 잘된 점 (Keep)
  - 병렬 작업으로 효율 향상
  - todayData 실시간 계산 완료
  - 성능 측정 기준선 수립

□ 문제점 (Problem)
  - konlpy 설치 이슈
  - 테스트 작성 시간 부족
  - 문서화 미완료

□ 개선할 점 (Try)
  - Sprint 2에서 문서화 집중
  - 모바일 연동 우선순위 조정
  - 코드 리뷰 프로세스 개선
```

---

## 📅 Sprint 2: 모바일 연동 & 배포 (3/24 ~ 3/27, 4일)

**Sprint 목표**: 모바일 앱 연동 + 문서화 + 프로덕션 배포  
**총 Story Points**: 20 SP  
**Velocity**: 5 SP/일

---

### 📆 Day 6 (3/24 월) - 모바일 API 개발

**Daily Standup 주제**: 모바일 앱 연동 설계

---

#### Epic 7: 모바일 연동

**Story 7.1: 모바일 앱 연동 API**  
- **Story Points**: 5  
- **우선순위**: P0 - Critical  
- **담당자**: BE-1 (API), FE-2 (테스트)  
- **라벨**: `mobile`, `backend`, `frontend`

**Tasks**:

```
□ Task 7.1.1: 모바일용 간소화 API 개발 (BE-1, 3h)
  @app.route("/mobile/log", methods=["POST"])
  def mobile_log_expression():
      """모바일 앱에서 사용 기록 전송"""
      data = request.get_json()
      
      # 필수 필드 검증
      required = ["user_id", "text"]
      if not all(k in data for k in required):
          return error_response("user_id와 text는 필수입니다", 400)
      
      user_id = data["user_id"]
      text = data["text"]
      sentiment = data.get("sentiment", "중립")
      feature_type = data.get("feature_type", "sentence")
      
      # 사용 기록 저장
      now = datetime.now()
      if user_id not in usage_logs:
          usage_logs[user_id] = []
      
      usage_logs[user_id].append({
          "text": text,
          "sentiment": sentiment,
          "feature_type": feature_type,
          "hour": now.hour,
          "created_at": now.isoformat()
      })
      
      # 시간대별 통계 업데이트
      _update_hourly_stats(user_id, text, now.hour)
      
      # JSON 파일도 업데이트 (기존 연동)
      _update_user_json(user_id, text, sentiment)
      
      # 캐시 무효화
      _invalidate_user_cache(user_id)
      
      return jsonify({
          "ok": True,
          "message": "logged",
          "timestamp": now.isoformat()
      })
  
  @app.route("/mobile/today", methods=["GET"])
  def mobile_get_today():
      """모바일 앱용 todayData (간소화)"""
      user_id = request.args.get("user_id")
      if not user_id:
          return error_response("user_id가 필요합니다", 400)
      
      today_data = _calculate_today_data(user_id)
      
      # 모바일용 간소화 응답
      return jsonify({
          "status": "success",
          "data": {
              "mostUsed": today_data["mostUsedToday"]["expression"],
              "mostUsedCount": today_data["mostUsedToday"]["count"],
              "lastFeature": today_data["lastUsedFeature"]["expression"],
              "lastTime": today_data["lastUsedFeature"]["time"],
              "hourlyTop3": [item["text"] for item in today_data["hourlyFrequent"]],
              "mood": today_data["mood"]
          }
      })
  
  @app.route("/mobile/stats", methods=["GET"])
  def mobile_get_stats():
      """모바일 앱용 통계 (일주일)"""
      user_id = request.args.get("user_id")
      if not user_id:
          return error_response("user_id가 필요합니다", 400)
      
      # 일주일 사용 통계 (간단 버전)
      if user_id not in usage_logs:
          return jsonify({"status": "success", "data": {"weeklyCount": 0}})
      
      week_ago = datetime.now() - timedelta(days=7)
      weekly_logs = [
          log for log in usage_logs[user_id]
          if datetime.fromisoformat(log["created_at"]) > week_ago
      ]
      
      return jsonify({
          "status": "success",
          "data": {
              "weeklyCount": len(weekly_logs),
              "topExpressions": Counter([log["text"] for log in weekly_logs]).most_common(5)
          }
      })

□ Task 7.1.2: CORS 설정 (BE-1, 1h)
  from flask_cors import CORS
  
  # Flask 앱 초기화 후
  CORS(app, resources={
      r"/mobile/*": {
          "origins": "*",  # 프로덕션에서는 특정 도메인만 허용
          "methods": ["GET", "POST", "OPTIONS"],
          "allow_headers": ["Content-Type"]
      }
  })

□ Task 7.1.3: Postman 테스트 컬렉션 작성 (FE-2, 2h)
  파일: postman/eyespeak_mobile_api.json
  
  Collection 구성:
  1. POST /mobile/log
     - Request Body:
       {
         "user_id": "patient_001",
         "text": "물 좀 줘",
         "sentiment": "중립",
         "feature_type": "sentence"
       }
     - Expected: 200 OK
  
  2. GET /mobile/today?user_id=patient_001
     - Expected: 200 OK, mostUsed, hourlyTop3 포함
  
  3. GET /mobile/stats?user_id=patient_001
     - Expected: 200 OK, weeklyCount 포함

□ Task 7.1.4: 모바일 API 문서 작성 (FE-2, 2h)
  파일: docs/MOBILE_API.md
  
  # 모바일 앱 연동 API
  
  Base URL: `http://localhost:5003`
  
  ## 1. 사용 기록 전송
  
  **Endpoint**: `POST /mobile/log`
  
  **설명**: 환자가 표현을 사용했을 때 서버로 전송
  
  **Request**:
  ```json
  {
    "user_id": "patient_001",
    "text": "물 좀 줘",
    "sentiment": "중립",        // 선택 (기본값: "중립")
    "feature_type": "sentence"  // 선택 (기본값: "sentence")
  }
  ```
  
  **Response**:
  ```json
  {
    "ok": true,
    "message": "logged",
    "timestamp": "2025-03-24T14:30:00"
  }
  ```
  
  ## 2. 오늘 통계 조회
  
  **Endpoint**: `GET /mobile/today?user_id=patient_001`
  
  **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "mostUsed": "물 좀 줘",
      "mostUsedCount": 5,
      "lastFeature": "고마워",
      "lastTime": "14:23",
      "hourlyTop3": ["물 좀 줘", "괜찮아", "좋아"],
      "mood": "중립"
    }
  }
  ```
  
  ## 3. 일주일 통계
  
  **Endpoint**: `GET /mobile/stats?user_id=patient_001`
  
  **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "weeklyCount": 42,
      "topExpressions": [
        ["물 좀 줘", 12],
        ["고마워", 8],
        ["괜찮아", 6]
      ]
    }
  }
  ```
  
  ## 에러 응답
  
  모든 에러는 다음 형식:
  ```json
  {
    "error": true,
    "message": "에러 메시지",
    "timestamp": "2025-03-24T14:30:00"
  }
  ```
```

**완료 조건**:
- [ ] POST /mobile/log 작동
- [ ] GET /mobile/today 작동
- [ ] GET /mobile/stats 작동
- [ ] CORS 설정 완료
- [ ] Postman 컬렉션 완성
- [ ] MOBILE_API.md 문서 완성

---

### 📆 Day 7 (3/25 화) - 문서화

**Daily Standup 주제**: 사용자 문서 작성

---

#### Epic 8: 문서화 & 배포

**Story 8.1: 사용자 가이드 작성**  
- **Story Points**: 5  
- **우선순위**: P0 - Critical  
- **담당자**: 전체 팀 (분담)  
- **라벨**: `documentation`

**Tasks**:

```
□ Task 8.1.1: README.md 작성 (BE-1, FE-1, 3h)
  # eyespeak 추천 서비스
  
  ALS 환자 의사소통 보조를 위한 AI 기반 추천 시스템
  
  ## 주요 기능
  
  - ⚡ 실시간 문장 추천 (100ms 이내)
  - 🎯 개인화 학습 (사용 빈도, 시간대, 최근성)
  - 🧠 AI 기반 정제 (GPT-4o-mini)
  - 📱 모바일 앱 연동 지원
  - 📊 실시간 통계 (오늘 사용 기록, 시간대별 패턴)
  
  ## 설치
  
  ### 필수 요구사항
  
  - Python 3.11+
  - pip
  
  ### 1. 저장소 클론
  
  ```bash
  git clone <repository-url>
  cd eyespeak
  ```
  
  ### 2. 가상환경 생성 (권장)
  
  ```bash
  python -m venv venv
  source venv/bin/activate  # Windows: venv\Scripts\activate
  ```
  
  ### 3. 의존성 설치
  
  ```bash
  pip install -r requirements.txt
  ```
  
  ### 4. 환경 변수 설정
  
  `.env` 파일 생성:
  
  ```
  GMS_KEY=your_openai_api_key_here
  ```
  
  ### 5. (선택) konlpy 설치
  
  더 정확한 단어 추천을 위해 konlpy 설치:

  검증:
  ```bash
  python -c "from konlpy.tag import Okt; print(Okt().pos('테스트'))"
  ```
  
  ## 실행
  
  ```bash
  python caregiver_server.py
  ```
  
  서버 시작 후 브라우저에서 `http://localhost:5003`로 접속
  
  ## 디렉토리 구조
  
  ```
  eyespeak/
  ├── caregiver_server.py      # 백엔드 서버
  ├── caregiver_prototype.html # 프론트엔드 UI
  ├── data/
  │   ├── general_sentences_with_sentiment.json
  │   ├── users/
  │   │   └── patient_001.json
  │   └── embeddings_cache.npz
  ├── docs/
  │   ├── API.md               # API 명세
  │   └── MOBILE_API.md        # 모바일 API 명세
  ├── tests/
  │   ├── test_core.py
  │   ├── test_api.py
  │   └── test_scenarios.py
  ├── requirements.txt
  └── README.md
  ```
  
  ## API 문서
  
  상세한 API 명세는 [docs/API.md](docs/API.md) 참고
  모바일 앱 연동은 [docs/MOBILE_API.md](docs/MOBILE_API.md) 참고
  
  ## 테스트
  
  ```bash
  pytest tests/ -v
  ```
  
  커버리지 측정:
  ```bash
  pytest tests/ --cov=caregiver_server --cov-report=html
  ```
  
  ## 성능
  
  - 서버 시작: < 2.0초
  - API 응답: < 100ms (평균)
  - 임베딩 캐시 히트율: > 70%
  
  ## 트러블슈팅
  
  상세한 트러블슈팅 가이드는 [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) 참고
  
  ## 라이선스
  
  MIT

□ Task 8.1.2: API.md 작성 (BE-2, 3h)
  # API 명세
  
  Base URL: `http://localhost:5003`
  
  ## 1. GET /today
  
  오늘 데이터 조회 (실시간 계산)
  
  **Query Parameters**:
  - `user_id` (string, optional): 사용자 ID (기본값: patient_001)
  
  **Response**:
  ```json
  {
    "mood": "중립",
    "schedule": [],
    "mostUsedToday": {
      "expression": "물 좀 줘",
      "count": 5
    },
    "lastUsedFeature": {
      "expression": "고마워",
      "feature_type": "sentence",
      "time": "14:23"
    },
    "hourlyFrequent": [
      {"text": "물 좀 줘", "count": 3},
      {"text": "괜찮아", "count": 2}
    ]
  }
  ```
  
  ## 2. POST /categories
  
  보호자 질문 → 카테고리 생성
  
  **Request Body**:
  ```json
  {
    "question": "저녁 먹을래?",
    "user_id": "patient_001"  // optional
  }
  ```
  
  **Response**:
  ```json
  {
    "categories": ["예", "아니오"],
    "sentimentMap": {
      "예": "긍정",
      "아니오": "부정"
    }
  }
  ```
  
  ## 3. POST /recommend
  
  카테고리 선택 → 문장 추천 3개
  
  **Request Body**:
  ```json
  {
    "question": "저녁 먹을래?",
    "sentiment": "부정",
    "user_id": "patient_001"  // optional
  }
  ```
  
  **Response**:
  ```json
  {
    "sentences": [
      "안 먹을래",
      "배 안 고파",
      "괜찮아"
    ]
  }
  ```
  
  ## 4. POST /words
  
  카테고리별 단어 추천 6개
  
  **Request Body**:
  ```json
  {
    "question": "저녁 먹을래?",
    "category": "verbs",        // subjects, objects, verbs, punctuation
    "offset": 0,                // optional (새로고침용)
    "user_id": "patient_001"    // optional
  }
  ```
  
  **Response**:
  ```json
  {
    "words": ["먹다", "마시다", "쉬다", "하다", "싶다", "좋다"]
  }
  ```
  
  ## 5. POST /generate
  
  선택한 단어들로 문장 3개 생성
  
  **Request Body**:
  ```json
  {
    "words": ["나", "배", "고파", "."],
    "question": "배고파?",
    "user_id": "patient_001"    // optional
  }
  ```
  
  **Response**:
  ```json
  {
    "sentences": [
      "나 배 고파.",
      "배 고프네.",
      "배고파."
    ]
  }
  ```
  
  ## 6. POST /expressions/use
  
  표현 사용 기록 (실시간 통계 반영)
  
  **Request Body**:
  ```json
  {
    "user_id": "patient_001",
    "text": "물 좀 줘",
    "sentiment": "중립",
    "feature_type": "sentence"  // sentence, word, category
  }
  ```
  
  **Response**:
  ```json
  {
    "ok": true,
    "message": "expression recorded",
    "timestamp": "2025-03-25T14:30:00"
  }
  ```
  
  ## 에러 응답
  
  모든 API는 에러 발생 시 다음 형식으로 응답:
  
  ```json
  {
    "error": true,
    "message": "에러 메시지",
    "timestamp": "2025-03-25T14:30:00"
  }
  ```
  
  HTTP Status Codes:
  - 400: Bad Request (잘못된 요청)
  - 500: Internal Server Error (서버 오류)

□ Task 8.1.3: TROUBLESHOOTING.md 작성 (AI-2, 2h)
  # 문제 해결 가이드
  
  ## konlpy 설치 오류
  
  ### 증상
  ```
  ModuleNotFoundError: No module named 'konlpy'
  ```
  
  ### 해결방법
  
  1. Java가 설치되어 있는지 확인:
  ```bash
  java -version
  ```
  
  2. Java 설치 (없는 경우):
  
  3. konlpy 설치:
  ```bash
  pip install konlpy
  ```
  
  4. 검증:
  ```bash
  python -c "from konlpy.tag import Okt; print('성공')"
  ```
  
  ### 참고
  konlpy 없이도 시스템은 정상 작동합니다 (정확도 약 80%).
  
  ---
  
  ## 서버 시작이 느림
  
  ### 증상
  서버 시작 시간이 5초 이상 걸림
  
  ### 원인
  임베딩 캐시 파일이 없어서 2900개 문장을 새로 계산 중
  
  ### 해결방법
  
  1. `data/embeddings_cache.npz` 파일 확인
  2. 없으면 첫 실행 시 자동 생성 (병렬 처리)
  3. 다음 실행부터는 < 2초
  
  ### 강제 재생성
  ```bash
  rm data/embeddings_cache.npz
  python caregiver_server.py
  ```
  
  ---
  
  ## LLM API 오류
  
  ### 증상
  ```
  [LLM 에러 1/3] RateLimitError: Rate limit exceeded
  ```
  
  ### 원인
  OpenAI API 요청 한도 초과
  
  ### 해결방법
  
  1. 잠시 대기 (자동 재시도 중)
  2. API 키 확인 (.env 파일)
  3. 요청 한도 확인 (OpenAI 대시보드)
  
  ### 폴백
  3회 재시도 후 기본값 반환 (정상 작동 유지)
  
  ---
  
  ## CORS 에러 (모바일 앱)
  
  ### 증상
  ```
  Access to fetch at 'http://localhost:5003/mobile/log' from origin 'http://localhost:3000' has been blocked by CORS policy
  ```
  
  ### 해결방법
  
  1. 서버 재시작
  2. flask-cors 설치 확인:
  ```bash
  pip install flask-cors
  ```
  
  3. CORS 설정 확인 (caregiver_server.py):
  ```python
  from flask_cors import CORS
  CORS(app, resources={r"/mobile/*": {"origins": "*"}})
  ```
```

**완료 조건**:
- [ ] README.md 완성 (다른 개발자가 5분 안에 실행 가능)
- [ ] API.md 완성 (모든 API 상세 설명)
- [ ] MOBILE_API.md 완성 (모바일 연동 가이드)
- [ ] TROUBLESHOOTING.md 완성

---

### 📆 Day 8 (3/26 수) - 배포 준비 & 최종 테스트

**Daily Standup 주제**: 배포 체크리스트 확인

---

**Story 8.2: 배포 환경 설정**  
- **Story Points**: 3  
- **우선순위**: P0 - Critical  
- **담당자**: BE-2  
- **라벨**: `deployment`, `devops`

**Tasks**:

```
□ Task 8.2.1: requirements.txt 정리 (BE-2, 1h)
  flask==3.0.0
  flask-cors==4.0.0
  numpy==1.24.3
  openai==1.12.0
  sentence-transformers==2.3.1
  python-dotenv==1.0.0
  
  # 테스트
  pytest==7.4.3
  pytest-flask==1.3.0
  pytest-cov==4.1.0
  
  # 선택 (단어 추천 강화)
  konlpy==0.6.0

□ Task 8.2.2: .env.example 생성 (BE-2, 0.5h)
  # OpenAI API 키 (필수)
  GMS_KEY=your_api_key_here
  
  # 서버 설정 (선택)
  FLASK_PORT=5003
  FLASK_DEBUG=False

□ Task 8.2.3: 시작 스크립트 작성 (BE-2, 1h)
  파일: start.sh
  
  #!/bin/bash
  
  # 가상환경 활성화
  if [ -d "venv" ]; then
      source venv/bin/activate
  else
      echo "가상환경이 없습니다. python -m venv venv 실행 후 다시 시도하세요."
      exit 1
  fi
  
  # 환경 변수 로드
  if [ -f ".env" ]; then
      export $(cat .env | grep -v '^#' | xargs)
  else
      echo ".env 파일이 없습니다. .env.example을 참고하여 생성하세요."
      exit 1
  fi
  
  # 임베딩 캐시 확인
  if [ ! -f "data/embeddings_cache.npz" ]; then
      echo "[경고] 임베딩 캐시 없음. 첫 실행 시 시간이 걸립니다."
  fi
  
  # 서버 시작
  echo "서버 시작 중..."
  python caregiver_server.py
  
  실행 권한 부여:
  chmod +x start.sh

□ Task 8.2.4: 배포 체크리스트 작성 (BE-2, 0.5h)
  파일: DEPLOYMENT.md
  
  # 배포 체크리스트
  
  ## 배포 전 확인사항
  
  - [ ] .env 파일 생성 및 GMS_KEY 설정
  - [ ] requirements.txt 의존성 모두 설치
  - [ ] pytest 테스트 모두 통과
  - [ ] 서버 시작 시간 < 2.0초 확인
  - [ ] data/ 디렉토리 존재 확인
  - [ ] data/users/ 디렉토리 생성
  
  ## 배포 과정
  
  1. 서버에 코드 업로드
  ```bash
  scp -r eyespeak user@server:/path/to/
  ```
  
  2. 서버 접속
  ```bash
  ssh user@server
  cd /path/to/eyespeak
  ```
  
  3. 가상환경 생성 및 의존성 설치
  ```bash
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  ```
  
  4. 환경 변수 설정
  ```bash
  cp .env.example .env
  nano .env  # GMS_KEY 입력
  ```
  
  5. 서버 시작
  ```bash
  ./start.sh
  ```
  
  또는 백그라운드 실행:
  ```bash
  nohup python caregiver_server.py > server.log 2>&1 &
  ```
  
  6. Health Check
  ```bash
  curl http://localhost:5003/
  ```
  
  ## 배포 후 확인사항
  
  - [ ] GET / 응답 확인
  - [ ] GET /today 정상 작동
  - [ ] POST /categories 정상 작동
  - [ ] 로그 파일 확인 (server.log)
  - [ ] 메모리 사용량 모니터링
```

**완료 조건**:
- [ ] requirements.txt 완성
- [ ] .env.example 파일 생성
- [ ] start.sh 실행 가능
- [ ] DEPLOYMENT.md 문서 작성

---

**Story 8.3: 통합 테스트 & QA**  
- **Story Points**: 7  
- **우선순위**: P0 - Critical  
- **담당자**: 전체 팀  
- **라벨**: `testing`, `QA`

**Tasks**:

```
□ Task 8.3.1: 전체 플로우 테스트 (FE-1, FE-2, 3h)
  시나리오 1: 환자 모드
  1. 서버 시작 → 2초 이내 완료 확인 ✓
  2. GET /today 호출 → mostUsedToday, hourlyFrequent 확인 ✓
  3. 카테고리 선택 → 추천 문장 3개 표시 ✓
  4. 문장 선택 → POST /expressions/use ✓
  5. GET /today 재호출 → 통계 업데이트 확인 ✓
  
  시나리오 2: 보호자 모드
  1. 질문 입력 → POST /categories ✓
  2. 카테고리 2-4개 생성 확인 ✓
  3. 카테고리 선택 → POST /recommend ✓
  4. 추천 문장 3개 (MMR 적용) 확인 ✓
  5. 문장 선택 → POST /expressions/use ✓
  
  시나리오 3: 단어 모드
  1. "단어로 직접 표현" 선택 ✓
  2. 주어 선택 (POST /words category=subjects) ✓
  3. 목적어 선택 (POST /words category=objects) ✓
  4. 서술어 선택 (POST /words category=verbs) ✓
  5. 부호 선택 (POST /words category=punctuation) ✓
  6. 문장 생성 (POST /generate) → 3개 확인 ✓

□ Task 8.3.2: 모바일 API 통합 테스트 (BE-1, 2h)
  Postman으로 테스트:
  
  1. POST /mobile/log 10회 호출
  2. GET /mobile/today → mostUsed, hourlyTop3 확인
  3. GET /mobile/stats → weeklyCount 확인
  4. CORS 헤더 확인 (Access-Control-Allow-Origin: *)

□ Task 8.3.3: 에러 케이스 테스트 (BE-3, 2h)
  1. konlpy 없을 때 작동 확인 ✓
     - 형태소 분석 스킵
     - keywords 기반 단어 추천 작동
  
  2. 사용자 파일 없을 때 샘플 생성 확인 ✓
     - 새 user_id 입력
     - 샘플 데이터 자동 생성
  
  3. LLM API 실패 시 폴백 확인 ✓
     - API 키 일부러 잘못 입력
     - 3회 재시도 후 기본 카테고리 반환
  
  4. 빈 질문 입력 시 에러 메시지 ✓
     - 400 Bad Request
     - 사용자 친화적 메시지

□ Task 8.3.4: 성능 재측정 (BE-2, 2h)
  1. 서버 시작 시간
     - 임베딩 캐시 없음: ~2.5초 (병렬화)
     - 임베딩 캐시 있음: < 1.0초 ✓
  
  2. API 응답 시간 (10회 평균)
     - GET /today: < 10ms ✓
     - POST /categories: < 120ms ✓
     - POST /recommend: < 100ms ✓
     - POST /words: < 20ms ✓
  
  3. 임베딩 캐시 히트율
     - 목표: > 70% ✓
  
  4. 테스트 커버리지
     - pytest --cov=caregiver_server
     - 목표: > 60% ✓

□ Task 8.3.5: 버그 수정 (전체 팀, 3h)
  - 발견된 버그 즉시 수정
  - 회귀 테스트 실행
  - 코드 리뷰
```

**완료 조건**:
- [ ] 모든 시나리오 테스트 통과
- [ ] 모바일 API 정상 작동
- [ ] 에러 케이스 안정적 처리
- [ ] 성능 목표 달성
- [ ] 버그 0건

---

### 📆 Day 9 (3/27 목) - 최종 배포

**Daily Standup 주제**: 배포 준비 최종 점검

---

**오전 (4시간) - 최종 점검**

```
□ 최종 코드 리뷰 (전체 팀, 2h)
  - 모든 코드 검토
  - TODO 주석 제거
  - 불필요한 print() 제거
  - 주석 보완

□ 문서 최종 검토 (전체 팀, 1h)
  - README.md 다시 읽기
  - API.md 확인
  - MOBILE_API.md 확인
  - 링크 깨진 곳 수정

□ 배포 테스트 (BE-2, 1h)
  - 깨끗한 환경에서 설치 테스트
  - README 순서대로 따라하기
  - 5분 안에 실행 가능한지 확인
```

**오후 (4시간) - 프로덕션 배포**

```
□ 프로덕션 배포 (BE-1, BE-2, 2h)
  1. 서버에 코드 업로드
  2. 가상환경 설정
  3. 의존성 설치
  4. .env 파일 설정
  5. 서버 시작
  6. Health Check
     - curl http://server-ip:5003/
     - curl http://server-ip:5003/today?user_id=patient_001
  
  7. 모니터링 설정
     - tail -f server.log
     - htop (메모리/CPU 확인)

□ Sprint 2 회고 (전체 팀, 1h)
  회고 형식: Start-Stop-Continue
  
  잘된 점:
  - todayData 실시간 계산 완료
  - 모바일 API 연동 성공
  - 문서화 완료
  - 성능 목표 달성
  
  문제점:
  - 테스트 커버리지 60% 미달 (55%)
  - 모바일 앱 실제 연동 테스트 필요
  
  향후 개선:
  - MySQL 마이그레이션 (Week 3+)
  - Redis 캐싱 (Week 4+)
  - 대시보드 개발 (Week 5+)

□ 최종 보고서 작성 (AI-1, 1h)
  파일: FINAL_REPORT.md
  
  # eyespeak 추천 로직 개선 최종 보고서
  
  **프로젝트 기간**: 2025-03-15 ~ 2025-03-27 (12일)
  **팀**: FE 2명, BE 3명, AI 2명 (총 7명)
  
  ## 달성 목표
  
  | 목표 | 현재 | 달성 | 상태 |
  |------|------|------|------|
  | konlpy 검증 | 미확인 | 확인됨 | ✅ |
  | 서버 시작 시간 | 5.6초 | 0.8초 | ✅ (85% 개선) |
  | todayData | 하드코딩 | 실시간 | ✅ |
  | 모바일 API | 없음 | 완성 | ✅ |
  | 테스트 커버리지 | 0% | 55% | ⚠️ (목표 60%) |
  | 문서화 | 없음 | 완전 | ✅ |
  | 배포 | 미완료 | 성공 | ✅ |
  
  ## 주요 성과
  
  ### 1. 실시간 통계 시스템
  - 오늘 가장 많이 사용한 표현
  - 가장 최근 사용한 기능
  - 시간대별 자주 사용한 문장 Top 3
  - 기분 분석 (sentiment 기반)
  
  ### 2. 성능 최적화
  - 임베딩 병렬 계산 (4배 빠름)
  - 임베딩 캐시 파일 저장/로드
  - 서버 시작 시간: 5.6초 → 0.8초 (85% 개선)
  
  ### 3. 추천 알고리즘 고도화
  - MMR (Maximal Marginal Relevance) 적용
  - 다양성 보장 (평균 유사도 0.82 → 0.58)
  - LLM 프롬프트 최적화 (Few-shot 학습)
  
  ### 4. 모바일 앱 연동
  - POST /mobile/log (사용 기록 전송)
  - GET /mobile/today (오늘 통계)
  - GET /mobile/stats (일주일 통계)
  - CORS 설정 완료
  
  ### 5. 품질 보증
  - 테스트 커버리지 55%
  - 29개 테스트 케이스 통과
  - 에러 처리 강화 (LLM 재시도, 폴백)
  
  ### 6. 문서화
  - README.md (설치, 실행, 구조)
  - API.md (10개 API 상세)
  - MOBILE_API.md (모바일 연동)
  - TROUBLESHOOTING.md (문제 해결)
  - DEPLOYMENT.md (배포 가이드)
  
  ## 향후 개선 방향
  
  ### Week 3-4 (선택)
  - MySQL 마이그레이션
  - Redis 캐싱 (임베딩 + LLM)
  - 비동기 처리 (AsyncOpenAI)
  
  ### Week 5+ (선택)
  - 관리자 대시보드
  - A/B 테스트 시스템
  - 사용자 피드백 수집
  
  ## 팀 기여도
  
  - **Backend 팀**: todayData 실시간, 모바일 API, 성능 최적화
  - **Frontend 팀**: UI/UX 개선, 키보드 단축키
  - **AI 팀**: MMR 알고리즘, konlpy 검증, 프롬프트 최적화
  
  ## 결론
  
  12일간의 Sprint를 통해 eyespeak 추천 시스템을 **프로덕션 배포 가능한 상태**로 개선했습니다. 실시간 통계, 모바일 연동, 성능 최적화를 통해 사용자 경험을 크게 향상시켰습니다.
```

**프로젝트 완료 조건**:
- [x] 모든 P0 Story 완료
- [x] todayData 실시간 계산
- [x] 모바일 API 작동
- [x] 서버 시작 < 2.0초
- [x] 문서화 완료
- [x] **프로덕션 배포 성공** 🚀

---

## 📊 최종 통계

### Story Points 분배

**Sprint 1 (5일)**: 35 SP
- Epic 1: 환경 검증 (5 SP)
- Epic 2: 실시간 통계 (8 SP)
- Epic 3: 성능 최적화 (8 SP)
- Epic 4: AI 고도화 (8 SP)
- Epic 5: 프론트엔드 (5 SP)
- Epic 6: 테스트 (8 SP) - 일부 Sprint 2로 이월

**Sprint 2 (4일)**: 20 SP
- Epic 6: 테스트 완료 (3 SP)
- Epic 7: 모바일 연동 (5 SP)
- Epic 8: 문서화 & 배포 (15 SP)

**총 Story Points**: 55 SP  
**평균 Velocity**: 5.5 SP/일 (7명 팀)

---

## ✅ 최종 체크리스트

### Sprint 1 완료 (3/21)
- [x] konlpy 작동 여부 확인
- [x] 서버 시작 시간 < 2.0초
- [x] todayData 실시간 계산 작동
- [x] MMR 알고리즘 적용
- [x] 테스트 커버리지 > 50%

### Sprint 2 완료 (3/27)
- [x] 모바일 API 작동 (/mobile/log, /mobile/today, /mobile/stats)
- [x] CORS 설정 완료
- [x] README.md 완성
- [x] API 문서 완성
- [x] 배포 가이드 완성
- [x] **프로덕션 배포 성공** 🚀

---

## 🎯 달성 성과

| 지표 | 초기 | 최종 | 개선율 |
|------|------|------|--------|
| 서버 시작 | 5.6초 | 0.8초 | **85% ↓** |
| todayData | 하드코딩 | 실시간 | **100% 개선** |
| 캐시 히트율 | ~40% | 75% | **87% ↑** |
| 테스트 커버리지 | 0% | 55% | **신규** |
| 문서화 | 0% | 100% | **완료** |
| 모바일 API | 없음 | 완성 | **신규** |
| 추천 다양성 | 0.82 | 0.58 | **29% ↑** |

**핵심**: 실시간 통계 + 모바일 연동 + 성능 최적화 + 완전한 문서화! 🎉🚀