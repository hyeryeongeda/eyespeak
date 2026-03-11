# 유사도 검색 로직 정리

## 전체 구조 개요

두 가지 버전이 존재한다.

| 버전 | 파일 | 특징 |
|------|------|------|
| **현재 운영 버전** | `stt_server.py` | Bi-encoder만 사용, 코사인 유사도 + 가중치 |
| **아카이브 버전** | `archive/recommendation.py` | Bi-encoder → FAISS 검색 → Cross-encoder 재랭킹 |

---

## 1. Bi-encoder (임베딩 모델)

**모델:** `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers 로컬)
**대안:** GMS `text-embedding-3-large` (환경변수 `USE_GMS=true` 시)

```
입력 텍스트 → 임베딩 모델 → 고정 길이 벡터 (384차원 or 3072차원)
```

- 문장/단어를 각각 **독립적으로** 벡터로 변환
- 빠르고 DB 전체에 사전 계산 가능 (캐싱)
- 의미적 유사도를 벡터 거리로 표현

```python
# stt_server.py:71-74
def get_embedding(text: str) -> np.ndarray:
    if text not in embedding_cache:
        embedding_cache[text] = embed_model.encode(text, convert_to_numpy=True)
    return embedding_cache[text]
```

---

## 2. 문장 검색 로직 (`_search_sentences`)

### stt_server.py (현재 운영 버전)

```
질문 → 임베딩 → 일반 말뭉치 + 유저 DB 전체 순회 → 코사인 유사도 × 가중치 → 정렬 → 중복 제거 → 상위 k개
```

**핵심 공식:**
```
최종 점수 = cosine_sim(질문 벡터, 문장 벡터) × weight
```

**가중치(weight) 부여 방식:**

| 데이터 출처 | 가중치 계산 | 예시 |
|-------------|-------------|------|
| 일반 말뭉치 (`general_db`) | 고정 `1.0` | 1.0 |
| 유저 개인화 DB (`user_db`) | `1.0 + log(usage_count + 1)` | usage_count=9 → 1.0+log(10)≈3.3 |

- `usage_count`가 높을수록 점수가 로그 스케일로 올라감
- 로그를 쓰는 이유: 자주 쓴 문장을 우대하되, 선형 증가 방지 (outlier 억제)

```python
# stt_server.py:96-114
def _search_sentences(question: str, k: int = 5) -> list:
    q_vec = get_embedding(question)
    results = []
    for item in general_db + user_db:
        sim = cosine_sim(q_vec, get_embedding(item["text"]))
        results.append({
            "text": item["text"],
            "score": sim * item["weight"],  # 가중치 적용
            "source": item["source"],
        })

    seen = set()
    deduped = []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        if r["text"] not in seen:
            seen.add(r["text"])
            deduped.append(r)
    return deduped[:k]  # 상위 k개 반환
```

**코사인 유사도 계산:**
```python
# stt_server.py:77-78
def cosine_sim(a, b) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
```
- `1e-9` 더하는 이유: 영벡터 나누기 0 방지

---

### archive 버전 (Bi-encoder + FAISS + Cross-encoder)

```
질문 → 임베딩 → FAISS 내적 검색 (user_db, general_db 병렬) → 후보 12개 합산 → Cross-encoder 재랭킹 → 상위 5개 → LLM
```

**Cold Start에 따른 DB 비율 조절:**

| 유저 문장 수 | user_k | general_k | 이유 |
|-------------|--------|-----------|------|
| < 10개 | 0 | 12 | 데이터 부족 → 일반 말뭉치에 전적으로 의존 |
| 10~29개 | 4 | 8 | 혼합 검색 |
| 30개 이상 | 9 | 3 | 유저 데이터 충분 → 개인화 우선 |

**FAISS `IndexFlatIP` (내적 유사도):**
- 벡터가 L2 정규화된 상태면 내적 = 코사인 유사도
- `faiss.IndexFlatIP` → 정규화 벡터 기준 코사인 유사도와 동일

```python
# archive/vector_db.py:13
self.index = faiss.IndexFlatIP(self.dimension)
```

**병렬 검색:**
```python
# archive/recommendation.py:64-67
with ThreadPoolExecutor(max_workers=2) as executor:
    f_user = executor.submit(search_user)
    f_general = executor.submit(search_general)
    candidates = f_user.result() + f_general.result()
```

---

## 3. Cross-encoder (아카이브 버전만 사용)

**모델:** `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1`

```
(질문, 후보문장) 쌍 → Cross-encoder → 관련성 점수
```

- Bi-encoder와 달리 **질문-문장 쌍을 함께** 입력
- 더 정밀하지만 느림 → Bi-encoder로 후보를 좁힌 뒤 적용 (2-stage)

```python
# archive/cross_encoder_service.py:32-34
pairs = [(query, cand) for cand in candidates]
scores = self.model.predict(pairs)
return scores.tolist()
```

**2-stage 파이프라인 (아카이브):**
```
[Stage 1] Bi-encoder → FAISS → 12개 후보 (빠름, 대략적)
                         ↓
[Stage 2] Cross-encoder → 재랭킹 → 상위 5개 (느림, 정밀)
```

---

## 4. 단어 검색 로직 (`_search_words`)

```
질문 → 임베딩 → word_lists[category] 전체 순회 → 코사인 유사도 → 정렬 → 상위 k개
```

- 가중치 **없음** (단어 목록은 개인화 데이터 아님)
- `punctuation` 카테고리는 유사도 계산 없이 그냥 반환
- `offset` 파라미터: 새로고침 시 이미 본 단어 제외

```python
# stt_server.py:117-128
def _search_words(question: str, category: str, k: int = 4, offset: int = 0) -> list:
    if category == "punctuation":
        return word_lists["punctuation"]  # 유사도 계산 생략
    q_vec = get_embedding(question)
    word_list = word_lists.get(category, [])
    scored = sorted(word_list, key=lambda w: cosine_sim(q_vec, get_embedding(w)), reverse=True)
    if offset:
        rest = scored[offset:] or scored
        random.shuffle(rest)  # 새로고침 시 섞어서 다양하게
        return rest[:k]
    return scored[:k]
```

**카테고리 구조 (`word_lists.json`):**
```
subjects   → 주어 단어 목록
objects    → 목적어 단어 목록
verbs      → 동사 단어 목록
punctuation → 문장 부호 (., ,, !, ?, ~) → 유사도 계산 없음
```

---

## 5. 전체 플로우 요약

### 현재 운영 버전 (`stt_server.py`)

```
POST /recommend
  ↓ 질문 입력
  ↓ Bi-encoder → 질문 벡터
  ↓ general_db + user_db 순회 → cosine_sim × weight
  ↓ 중복 제거 → 상위 5개
  ↓ LLM(gpt-4o-mini) 정제
  → 추천 문장 3개 반환

POST /words
  ↓ 질문 + 카테고리 입력
  ↓ Bi-encoder → 질문 벡터
  ↓ word_lists[category] 순회 → cosine_sim
  → 유사 단어 4개 반환
```

### 아카이브 버전 (`archive/recommendation.py`)

```
질문 입력
  ↓ Bi-encoder → 질문 벡터
  ↓ FAISS 검색 (user_db || general_db 병렬, Cold Start 비율 조정)
  ↓ 후보 12개
  ↓ Cross-encoder 재랭킹
  ↓ 상위 5개
  ↓ LLM 정제
  → 추천 문장 반환
```

---

## 6. 두 버전 비교

| 항목 | stt_server.py (운영) | archive (구버전) |
|------|---------------------|-----------------|
| 검색 방식 | 선형 순회 + 코사인 유사도 | FAISS 인덱스 검색 |
| 재랭킹 | 없음 (가중치로 대체) | Cross-encoder |
| 개인화 | log(usage_count) 가중치 | Cold Start 비율 조정 |
| 속도 | DB 크기에 비례 (소규모 적합) | 빠름 (대규모 적합) |
| 정밀도 | 가중치 기반 단순 | 2-stage로 더 정밀 |
| 의존성 | 가벼움 | FAISS, Cross-encoder 필요 |
