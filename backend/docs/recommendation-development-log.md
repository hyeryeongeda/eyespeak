# 추천 로직 개발 및 고도화 과정

## 1. 추천 API 설계 및 구현

### 1-1. API 명세서 점검 (FE 타입 대조)

FE가 mock 데이터로 먼저 개발한 상태에서, BE 명세서와 FE 타입을 대조하여 차이점 발견 및 맞춤.

**주요 변경 내역:**

| 항목 | 명세서 (원래) | FE 코드 | 맞춘 방향 |
|---|---|---|---|
| 필드명 | `type`, `label`, `category`, `messageId` | `key`, `title`, `categoryKey`, `message` | FE에 맞춤 |
| 값 형식 | 대문자 `MOOD` | 소문자 `mood` | FE에 맞춤 |
| 응답 구조 | `[{id, content}]` | `string[]` | FE에 맞춤 (AI 실시간 생성 문장에 PK 없음) |

**교훈:** 명세서 작성 시 AI 실시간 생성 데이터와 DB 조회 데이터를 구분해서 응답 구조 설계해야 함.

### 1-2. 추천 API 5개 구현

| # | 엔드포인트 | BE | AI | 기능 |
|---|---|---|---|---|
| 1 | `GET /recommendations/categories` | O | `/recommend/hints` | 카테고리 목록 + 힌트 조회 |
| 2 | `POST /recommendations/sentences` | O | `/recommend/category` | 카테고리 기반 추천 문장 3개 |
| 3 | `POST /recommendations/replies` | O | `/recommend/replies` | 보호자 메시지 답변 추천 3개 |
| 4 | `POST /recommendations/words` | O | `/words` | 단계별 추천 단어 조회 |
| 5 | `POST /recommendations/compose` | O | `/generate` | 단어 조합 → 문장 생성 |

**BE:** `RecommendationController.java` — FE 요청 받아서 AI 서버로 중계
**AI:** `caregiver_server_db.py` — 임베딩 검색 + LLM 호출로 추천 생성

### 1-3. API 6번 (추천 문장 발화)

기존 명세서는 `POST /recommendations/send` REST API였으나, **기존 웹소켓 채팅(`/app/chat`)으로 대체**.

- 웹소켓 채팅이 이미 메시지 저장 + 보호자 실시간 전달 수행
- 별도 REST API 구현 불필요
- 학습 데이터 저장은 `POST /recommendations/record`로 처리

---

## 2. 성능 최적화

### 2-1. Baseline 측정 (실험 #1)

`@measure_time` 데코레이터를 핵심 함수 7개에 적용하고, `/debug/timing` 엔드포인트로 실시간 측정.

**Baseline 결과:**

| 함수 | 시간 | 비중 |
|---|---|---|
| `_refine_recommend` (LLM 후처리) | **1912ms** | 95.6% |
| `_search_sentences_mixed` (임베딩 검색) | 44ms | 2.2% |
| `_search_sentences` (임베딩 검색) | 30ms | 1.5% |
| `_load_user_data_from_db` (DB 조회) | 13ms | 0.7% |

**핵심 발견:** LLM 호출이 전체 시간의 95% 차지 → LLM 최적화가 최우선

### 2-2. _refine_recommend 캐시 추가 (실험 #2)

같은 질문 + 후보 조합이면 LLM 호출 없이 캐시에서 반환.

| 호출 | Before | After |
|---|---|---|
| 1차 (캐시 미스) | 2036ms | 2036ms |
| 2차 (캐시 히트) | 2036ms | **0.01ms** |

**효과:** 반복 질문 시 99.99% 시간 단축

### 2-3. LLM 모델 교체 + 프롬프트 축소 (실험 #3)

| 변경 | 내용 |
|---|---|
| 모델 | gpt-4o-mini (2 credit) → gpt-4.1-nano (1 credit) |
| 프롬프트 | ~60% 축소 (불필요한 설명 제거) |
| max_tokens | 축소 (100→60, 120→60, 200→150) |
| retry | _generate_categories 3회→1회 |

**결과:**

| 시나리오 | Before | After | 개선 |
|---|---|---|---|
| 새 질문 (평균) | 2036ms | 1326ms | **35% 단축** |
| 새 질문 (최소) | 2036ms | 738ms | **64% 단축** |
| credit 비용 | 2 credit | 1 credit | **50% 절감** |

### 2-4. 전체 엔드포인트 시간 측정 (실험 #5)

| 엔드포인트 | 병목 함수 | 1차 호출 | 2차 (캐시) |
|---|---|---|---|
| `/recommend` | `_refine_recommend` | ~1326ms | 0.01ms |
| `/categories` | `_generate_categories` | ~1548ms | 0.02ms |
| `/words` | `_llm_filter_words` | ~700ms | 0.0ms |

모든 LLM 호출 함수에 캐시 적용 완료.

---

## 3. 추천 다양성 개선 (MMR)

### 3-1. MMR(Maximal Marginal Relevance) 알고리즘 적용 (실험 #4)

기존 top-k 방식은 유사도 높은 문장끼리 몰리는 문제 발생.

**MMR 공식:**
```
MMR = λ × 관련성(질문↔후보) - (1-λ) × max(후보↔이미 선택된 문장 유사도)
```

- λ=0.7: 관련성 70%, 다양성 30%
- `_search_sentences`, `_search_general` 두 함수에 적용

**Before (top-k):** "기분 좋아", "기분 괜찮아", "기분이 좋았어" → 비슷한 문장 몰림
**After (MMR):** "기분 좋아", "좀 힘들어", "배고파" → 감정/주제 다양

**비용:** 검색 시간 +48ms (전체 대비 ~3%, 미미)

---

## 4. 콜드스타트 처리

신규 환자(expressions 0건)일 때 추천이 안 되는 문제 해결.

**변경:** `_search_sentences_mixed()`에서 user_db가 비어있으면 general_corpus에서 전부 가져옴.

```python
if len(user_db) == 0:  # 콜드스타트
    return _search_general(question, k=k_total)
```

- `/recommend`, `/recommend/category`, `/recommend/replies` 전부 자동 적용
- `_generate_categories`도 general_corpus에서 힌트 가져오도록 수정
- `/words`는 기존 default_word_lists 사용 (이미 처리됨)

---

## 5. 아키텍처 전환: AI → BE REST API 경유

### 5-1. 배경

AI 서버(Python)가 pymysql로 DB에 직접 접근하고 있었음.
보안/유지보수를 위해 AI 서버 → BE(Spring Boot) REST API → DB 구조로 전환.

### 5-2. 변경 내용

| # | Before (pymysql 직접) | After (BE API 경유) |
|---|---|---|
| 1 | `_load_user_data_from_db()` — SQL 쿼리 6개, 130줄 | → BE `GET /ai/user-context/{matchingId}` 호출 15줄 |
| 2 | `_load_general_db_from_db()` — SQL 직접 조회 | → BE `GET /ai/general-corpus` 호출 |
| 3 | `/expressions/use` — 분류 + DB 저장 | → `/expressions/classify` 분류만 반환, DB 저장은 BE가 |
| 4 | `/recommend/hints` — DB 직접 조회 | → 삭제 (BE가 직접 처리) |

**추가 보안:** `X-AI-API-Key` 헤더 인증으로 AI 서버 ↔ BE 통신 보호

### 5-3. 전환 후 API 구조

| 담당 | 엔드포인트 | 호출 방향 |
|---|---|---|
| BE | `GET /api/v1/ai/user-context/{matchingId}` | AI → BE |
| BE | `GET /api/v1/ai/general-corpus` | AI → BE |
| AI | `POST /expressions/classify` | BE → AI |
| AI | `POST /recommend/category` | BE → AI (기존) |
| AI | `POST /recommend/replies` | BE → AI (기존) |
| AI | `POST /words` | BE → AI (기존) |
| AI | `POST /generate` | BE → AI (기존) |

### 5-4. 검증

dev 서버(j14e205.p.ssafy.io/dev)에서 전체 흐름 테스트 완료:
- recommend, replies, category, words, classify 정상 동작
- DB 저장(record) 확인: expressionId=11 "배고파" lastUsed 업데이트 확인

---

## 6. 학습 데이터 저장 연동

### 6-1. 흐름

```
환자가 메시지 보냄 (채팅, 맞춤대화, 키보드 등 모든 경우)
  → 웹소켓 /app/chat → ChatService → message 저장 + 보호자 전달
  → FE가 POST /recommendations/record 호출 (백그라운드)
  → BE ExpressionRecordService.recordExpression()
    → AI /expressions/classify 호출 (감정/의도 분류 + 키워드 추출)
    → expressions 저장 (새 표현 INSERT / 기존 lastUsed 업데이트)
    → expression_keywords 저장
    → usage_log 저장
```

### 6-2. 역할 분리 (중복 저장 방지)

| 상황 | 누가 저장 | API |
|---|---|---|
| 채팅/맞춤대화/키보드 입력 | BE `ExpressionRecordService` | `POST /recommendations/record` |
| 몸과마음/즐겨찾기 문구 선택 | BE `UsageLogService` | `POST /usage-logs` |

서로 다른 상황에서 다른 API를 호출하므로 중복 저장 없음.

### 6-3. AI classify 실패 시

- fallback: sentiment=NEUTRAL, category="기타", keywords=[]
- 메시지 전송에 영향 없음 (try-catch 처리)
- 학습 데이터만 기본값으로 저장

---

## 7. 최종 성능 비교

| 항목 | 최적화 전 | 최적화 후 |
|---|---|---|
| 추천 응답 시간 (새 질문) | ~2000ms | ~1300ms (35% 단축) |
| 추천 응답 시간 (반복 질문) | ~2000ms | ~0.01ms (캐시) |
| LLM credit 비용 | 2 credit/호출 | 1 credit/호출 (50% 절감) |
| 추천 문장 다양성 | 비슷한 문장 몰림 | MMR로 다양성 확보 |
| 콜드스타트 | 추천 안 됨 | general_corpus 기반 추천 |
| DB 접근 | AI가 pymysql 직접 | BE REST API 경유 (보안 강화) |

---

## 8. 관련 브랜치 및 문서

### 브랜치
- `feat/server/S14P21E205-386-recommendation-api` — 추천 API 5개 구현
- `feat/ai/S14P21E205-452-model-comparison` — 성능 최적화 (모델 교체, 캐시, MMR)
- `feat/ai/S14P21E205-452-rest-migration` — AI 서버 REST 전환
- `feat/server/S14P21E205-452-chat-expression-record` — ChatService 학습 데이터 연동

### 문서
- `backend/docs/recommendation-api-changelog.md` — 추천 API 변경 기록 + FE 대조 + 흐름도
- `backend/docs/api-6-fe-be-ai-integration.md` — API 6번 웹소켓 연동 가이드
- `backend/docs/local-db-setup.md` — 로컬 DB 세팅 가이드
- `ai-recommend/EXPERIMENT_LOG.md` — MLflow 기반 성능 실험 기록
