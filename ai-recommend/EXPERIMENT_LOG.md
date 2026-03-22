# 추천 로직 최적화 실험 기록

---

## MLflow 추적 전략

### 왜 MLflow를 도입했는가?
추천 로직을 최적화/고도화하면서 "이전보다 나아졌는지"를 숫자로 비교해야 한다.
감으로 "빨라진 것 같다"가 아니라, **실험 전후 수치를 기록하고 비교**하기 위해 MLflow를 사용한다.

### 추적하는 지표 목록

#### 1. 응답 성능 (Latency)
| 지표 | 측정 방법 | 왜 중요한지 |
|---|---|---|
| API 응답 시간 (ms) | `TimingMiddleware` 자동 측정 | 환자가 체감하는 대기 시간 |
| 임베딩 검색 시간 (ms) | `@measure_time` on `_search_sentences` 등 | 검색 단계 병목 파악 |
| LLM 호출 시간 (ms) | `@measure_time` on `_refine_recommend` 등 | 가장 느린 구간 (외부 API 호출) |
| DB 조회 시간 (ms) | `@measure_time` on `_load_user_data_from_db` | DB 쿼리 병목 파악 |

#### 2. 추천 정확도 (Accuracy)
| 지표 | 계산 방법 | 왜 중요한지 |
|---|---|---|
| pick_rate (%) | 추천 문장 선택 횟수 / 전체 발화 횟수 | 추천이 실제로 유용한지 |
| hit_rate (%) | 추천 문장 선택 횟수 / (추천 호출 x 3) | 추천 3개 중 채택 비율 |
| rank_1_rate | 1번 추천 채택 횟수 | 가장 적절한 추천이 1순위에 오는지 |
| rank_2_rate | 2번 추천 채택 횟수 | 순위별 분포 확인 |
| rank_3_rate | 3번 추천 채택 횟수 | |

#### 3. 검색 품질 (Search Quality)
| 지표 | 계산 방법 | 왜 중요한지 |
|---|---|---|
| avg_similarity | 추천 후보 평균 코사인 유사도 | 검색이 질문과 관련 있는 결과를 가져오는지 |
| top_similarity | 1순위 후보 유사도 | 최고 매칭 품질 |
| candidate_count | 후보 풀 크기 | 데이터가 충분한지 |

#### 4. 모델/실험 파라미터 (Params)
최적화 전후 비교 시 어떤 설정이 달라졌는지 기록한다.

| 파라미터 | 현재 값 | 최적화 시 변경 대상 |
|---|---|---|
| embed_model | paraphrase-multilingual-MiniLM-L12-v2 | 다른 다국어 모델 비교 |
| llm_model | gpt-4o-mini | 모델 변경 시 품질/속도 비교 |
| llm_temperature (추천) | 0.7 | 다양성 vs 정확도 트레이드오프 |
| llm_temperature (카테고리) | 0.3 | 카테고리 생성 안정성 |
| k_total | 6 | 후보 개수 조절 |
| k_user / k_general 비율 | 50:50 | user DB vs general DB 비율 |
| mmr_lambda | 미적용 | MMR 적용 시 다양성 조절 |

### 측정 도구 구성

```
[모든 API 요청] → TimingMiddleware → API 응답 시간 자동 기록
[핵심 함수 7개] → @measure_time 데코레이터 → 함수별 실행 시간 기록
[추천 채택]     → _recommend_stats 딕셔너리 → 채택률 계산
         ↓
   GET /debug/timing          → 실시간 확인
   POST /debug/mlflow-log     → MLflow에 영구 기록
   POST /debug/reset-timing   → 초기화
         ↓
   $ mlflow ui → 브라우저에서 실험 비교 그래프
```

---

## 실험 #1: Baseline 측정 (2026-03-20)

### 목적
FastAPI 전환 후 현재 상태(baseline)의 성능 수치를 기록한다.
이후 최적화(MMR, 프롬프트 개선 등)와 비교하기 위한 기준점.

### 환경
- 프레임워크: FastAPI + uvicorn
- 임베딩 모델: paraphrase-multilingual-MiniLM-L12-v2
- LLM: gpt-4o-mini (GMS API)
- DB: MySQL 8.0 (Docker, localhost:3306)
- 측정 도구: MLflow (로컬), @measure_time 데코레이터, TimingMiddleware

### 테스트 시나리오
1. `/recommend` — 추천 문장 3개 생성
2. `/categories` — 카테고리 생성
3. `/words` — 단어 추천
4. `/debug/timing` — 함수별 시간 확인

### 결과 (2026-03-20 측정)

#### API 응답 시간

| API | 평균 응답시간 | 호출 횟수 | 비고 |
|---|---|---|---|
| `/recommend` | **1515.23 ms** | 3 | 임베딩 검색 + LLM 후처리 |
| `/categories` | **2223.24 ms** | 1 | LLM 카테고리 생성 (가장 느림) |
| `/today` | **13.22 ms** | 1 | DB 조회만 (빠름) |
| `/docs` | **0.38 ms** | 2 | Swagger UI (정적) |

#### 함수별 평균 실행시간

| 함수 | 평균 실행시간 | 호출 횟수 | 분석 |
|---|---|---|---|
| _refine_recommend | **2198.76 ms** | 2 | LLM 후처리 (**최대 병목**) |
| _generate_categories | **1083.39 ms** | 2 | LLM 카테고리 생성 |
| _search_sentences_mixed | **54.39 ms** | 2 | user+general 혼합 검색 (양호) |
| _search_sentences | **30.66 ms** | 2 | 임베딩 유사도 검색 (양호) |
| _load_user_data_from_db | **24.73 ms** | 4 | DB 조회 (빠름) |

#### 추천 채택률 (초기값)

| 지표 | 값 | 비고 |
|---|---|---|
| recommend_calls | 2 | 추천 API 호출 횟수 |
| expression_use_total | 0 | 아직 사용 기록 없음 |
| expression_use_from_recommend | 0 | 추천에서 선택한 횟수 |
| hit_rate | 0% | 실제 사용자 테스트 후 측정 |
| pick_rate | 0% | 실제 사용자 테스트 후 측정 |

#### 병목 분석

```
/recommend 평균 응답 시간: 1515ms

구간별 비중:
├─ _refine_recommend (LLM 후처리)     : ~2199ms (LLM 응답 속도에 따라 변동)
├─ _search_sentences_mixed (임베딩 검색): ~54ms   (3.6%)
├─ _load_user_data_from_db (DB 조회)   : ~25ms   (1.6%)
└─ 기타 (네트워크, 직렬화 등)           : 나머지

/categories 평균 응답 시간: 2223ms
├─ _generate_categories (LLM 호출)    : ~1083ms (48.7%)
├─ _load_user_data_from_db (DB 조회)   : ~25ms   (1.1%)
└─ _search_sentences (힌트 검색)       : ~31ms   (1.4%)
```

**핵심 발견:**
1. **LLM 호출이 전체 시간의 ~90%** 차지 → 임베딩/DB 최적화보다 LLM 호출 최적화가 우선
2. DB 조회(24ms)와 임베딩 검색(30ms)은 이미 충분히 빠름
3. `_generate_categories`도 LLM 호출이라 1초 이상 소요
4. 최적화 방향: LLM 응답 캐싱, 프롬프트 단축, 또는 병렬 호출 검토

#### 최적화 우선순위 (Baseline 기반)

| 순위 | 대상 | 현재 | 기대 효과 |
|---|---|---|---|
| 1 | `_refine_recommend` LLM 캐싱 | 2199ms | 반복 질문 시 0ms (캐시 히트) |
| 2 | `_generate_categories` LLM 캐싱 | 1083ms | 동일 질문 시 0ms (이미 category_cache 있음, 효과 확인 필요) |
| 3 | LLM 프롬프트 토큰 수 축소 | - | 응답 시간 10~30% 단축 가능 |
| 4 | 임베딩 벡터 사전 행렬화 | 31~54ms | 5~10ms로 단축 가능 (우선순위 낮음) |

### 재측정 (2026-03-22, @measure_time 데코레이터 적용 후)

| 함수 | 시간 | 비중 | 3/20 대비 |
|---|---|---|---|
| _refine_recommend | **1912.95 ms** | 95.6% | 2199ms → 1913ms (비슷, LLM 응답 속도 변동) |
| _search_sentences_mixed | 44.78 ms | 2.2% | 54ms → 45ms (양호) |
| _search_sentences | 30.07 ms | 1.5% | 31ms → 30ms (양호) |
| _load_user_data_from_db | 13.37 ms | 0.7% | 25ms → 13ms (양호) |

**결론:** Baseline 재확인 완료. `_refine_recommend`가 전체의 95% 차지 — 여기에 캐시 추가가 최우선.

### MLflow run_name
`baseline`

### MLflow 스크린샷
- MLflow UI: `http://localhost:5001` > eyespeak-recommend > baseline
- 측정일: 2026-03-20, 재측정: 2026-03-22

---

## 실험 #2: _refine_recommend 캐시 추가 (2026-03-22)

### 목적
최대 병목인 `_refine_recommend` (LLM 후처리)에 캐시를 추가하여 반복 질문 시 LLM 호출을 제거한다.

### 변경 내용
- `_refine_cache: dict = {}` 추가
- 캐시 키: `(question, tuple(candidate_texts), sentiment_context)`
- 같은 질문+후보 조합이면 LLM 호출 없이 캐시에서 반환

### 결과

#### _refine_recommend 시간 비교

| 호출 | 시간 | 비고 |
|---|---|---|
| 1차 (캐시 미스) | **2036.13 ms** | LLM 호출 |
| 2차 (캐시 히트) | **0.01 ms** | 캐시 반환, LLM 호출 없음 |

#### 전체 함수별 시간 (2회 호출 평균)

| 함수 | 평균 | 1차 | 2차 (캐시) |
|---|---|---|---|
| _refine_recommend | 1018.07ms | 2036.13ms | **0.01ms** |
| _search_sentences_mixed | 34.85ms | 46.86ms | 22.83ms |
| _search_sentences | 16.28ms | 32.55ms | 0.02ms |
| _load_user_data_from_db | 11.85ms | 11.03ms | 12.67ms |

### 분석
- **캐시 히트 시 99.99% 시간 단축** (2036ms → 0.01ms)
- 임베딩 검색도 캐시 효과로 2차 호출 시 빨라짐
- **한계:** 완전히 같은 질문+후보 조합일 때만 히트. 새로운 질문에는 여전히 LLM 호출 필요
- **다음 단계:** LLM 프롬프트 토큰 축소로 1차 호출(캐시 미스) 시간도 단축 필요

---

## 실험 #3: LLM 모델 교체 + 프롬프트 축소 (2026-03-22)

### 목적
LLM 모델을 gpt-4o-mini → gpt-4.1-nano로 교체하고, 프롬프트 토큰을 축소하여 1차 호출(캐시 미스) 시간을 단축한다.

### 변경 내용
1. **모델 교체:** `gpt-4o-mini` (2 credit) → `gpt-4.1-nano` (1 credit) — 5곳 모두 교체
2. **프롬프트 축소:** 4개 함수의 프롬프트 ~60% 축소 (불필요한 설명 제거, 핵심만)
3. **max_tokens 축소:** _refine_recommend 100→60, _generate_from_words 120→60, _generate_categories 200→150
4. **retry 제거:** _generate_categories retry 3회→1회 (실패 시 fallback 바로 반환)

### 결과

#### _refine_recommend 시간 비교 (3회 호출)

| 호출 | gpt-4o-mini (before) | gpt-4.1-nano (after) |
|---|---|---|
| 1차 | 2036ms | 1782ms |
| 2차 | - | 1458ms |
| 3차 | - | **738ms** |
| **평균** | **2036ms** | **1326ms (35% 단축)** |
| **최소** | 2036ms | **738ms (64% 단축)** |

#### 전체 함수별 시간 (gpt-4.1-nano, 3회 평균)

| 함수 | 평균 | 최소 | 최대 |
|---|---|---|---|
| _refine_recommend | **1325.84ms** | 737.63ms | 1782.09ms |
| _search_sentences_mixed | 45.83ms | 39.75ms | 54.95ms |
| _search_sentences | 29.73ms | 26.11ms | 33.68ms |
| _load_user_data_from_db | 18.66ms | 9.95ms | 24.32ms |

### 분석
- 모델 교체로 평균 35% 시간 단축, credit 비용도 2→1로 절반
- 3차 호출에서 738ms까지 떨어짐 — GMS 네트워크 워밍업 영향
- 프롬프트 축소 + max_tokens 축소로 입출력 토큰 총량 감소
- 추천 문장 품질은 유지됨 ("나 좋아", "별로야 좀 피곤해", "그냥 그래, 힘들어" 등 자연스러운 반말)
- **다음 단계:** LLM 호출 자체를 제거하는 규칙 기반 추천 방식 검토

---

## 실험 계획

### 실험 #2: MMR 적용 (예정)
- 목표: 추천 문장 다양성 보장 (비슷한 문장 3개 → 다양한 문장 3개)
- 변경: `_search_sentences()` → `_search_sentences_with_mmr()` 추가
- 파라미터: lambda (0.5~0.8 범위 실험)
- 비교 지표: 응답 시간 변화, 추천 문장 간 유사도 분산

### 실험 #3: LLM 프롬프트 최적화 (예정)
- 목표: 카테고리 생성 품질 + 추천 문장 자연스러움 개선
- 변경: Few-shot 예시 추가, 프롬프트 구조 개선
- 비교 지표: 응답 시간, 카테고리 생성 실패율(fallback 횟수)

### 실험 #4: 호출 시간 단축 (예정)
- 목표: 전체 응답 시간 50% 단축
- 변경 후보:
  - 임베딩 벡터 사전 계산 (numpy 행렬 연산)
  - DB 커넥션 풀링
  - 캐시 크기 제한 (메모리 관리)
  - 배치 임베딩 적용
- 비교 지표: 함수별 실행 시간 before/after

---

## 트러블슈팅 기록

### TS-001: Flask → FastAPI 전환 시 요청 파싱 차이
- **증상**: Flask에서 `request.json`으로 받던 요청이 FastAPI에서 안 됨
- **원인**: FastAPI는 Pydantic 모델로 요청을 받음 (`request.json` 없음)
- **해결**: 각 엔드포인트별 Pydantic 요청 모델 6개 생성
- **교훈**: FastAPI는 타입 검증이 자동이라 잘못된 요청을 프레임워크가 걸러줌

### TS-002: _(추가 예정)_
- **증상**:
- **원인**:
- **해결**:
- **교훈**:

---

## 회고

### 2026-03-20: 초기 세팅 회고

**잘한 점:**
- Flask → FastAPI 전환으로 Swagger 자동 생성 (`/docs`)
- MLflow를 `metrics.py`로 분리해서 서버 코드 깔끔하게 유지
- 미들웨어로 모든 API 응답 시간을 자동 측정하는 구조

**아쉬운 점:**
- Baseline 수치를 아직 못 채움 (서버 실행 후 기록 필요)
- 추천 채택률은 실제 사용자 테스트가 있어야 의미 있는 데이터가 쌓임

**다음에 할 것:**
- [ ] 서버 띄우고 Baseline 수치 기록 (`실험 #1` 결과 채우기)
- [ ] MMR 알고리즘 구현 (`실험 #2`)
- [ ] LLM 프롬프트 Few-shot 예시 추가 (`실험 #3`)
- [ ] MLflow UI에서 실험 비교 스크린샷 남기기
