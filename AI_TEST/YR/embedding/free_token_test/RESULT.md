# ALS 환자 의사소통 시스템 - 오른쪽 문장 추천 로직

## 프로젝트 개요
ALS(루게릭병) 환자가 보호자의 음성 입력(STT)에 대해 답변할 수 있는 문장 4개를 추천하는 시스템.

---

## 시스템 아키텍처

```
보호자 STT 입력
      ↓
1. Bi-encoder 임베딩 (쿼리 벡터화)
      ↓
2. FAISS 벡터 DB 검색 (후보 20개)
   ├── 환자 과거 문장 DB  (user_sentences)
   └── 일반 대화 문장 DB  (general_sentences)
      ↓
3. Cross-encoder 재랭킹 (정밀 유사도 계산)
      ↓
4. 상위 5개 선별
      ↓
5. LLM 재구성 → 최종 답변 4개 반환
```

---

## 기술 스택

| 역할 | 모델 | 비고 |
|------|------|------|
| Bi-encoder (GMS) | `text-embedding-3-large` | 3072차원, OpenAI API |
| Bi-encoder (로컬) | `paraphrase-multilingual-MiniLM-L12-v2` | 384차원, 무료 |
| Cross-encoder | `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` | 로컬 실행, 항상 사용 |
| LLM (GMS) | `gpt-4o-mini` | 답변 재구성 |
| LLM (로컬) | 템플릿 반환 | 상위 4개 그대로 반환 |
| 벡터 DB | FAISS `IndexFlatIP` | 코사인 유사도 (정규화된 내적) |

### GMS vs 로컬 전환
```bash
# .env 설정
USE_GMS=false   # 로컬 (기본값, API 키 불필요)
USE_GMS=true    # GMS (API 키 필요: GMS_KEY=...)
```

---

## 핵심 로직 상세

### 1. Cold Start 비율 조정 (`recommendation.py`)

환자 데이터가 적을수록 일반 문장 비중을 높임.

```
환자 문장 수 < 10개  →  user:0,  general:20  (신규 환자)
환자 문장 수 < 30개  →  user:6,  general:14  (초기 축적)
환자 문장 수 ≥ 30개  →  user:15, general:5   (데이터 충분)
```

### 2. FAISS 검색 (`vector_db.py`)

- 인덱스 타입: `IndexFlatIP` (정규화 벡터 + 내적 = 코사인 유사도)
- 임베딩 저장 시 L2 정규화 적용
- 검색 결과: `(distances, indices)` 튜플 반환

### 3. Cross-encoder 재랭킹 (`cross_encoder_service.py`)

Bi-encoder가 반환한 후보 20개에 대해 `(query, candidate)` 쌍을 Cross-encoder로 정밀 채점.
- Bi-encoder: 빠르지만 독립적으로 인코딩 (의미 유사도)
- Cross-encoder: 느리지만 쿼리-후보 쌍을 함께 처리 (정밀도 높음)

### 4. LLM 재구성 (`llm_service.py`)

```
입력: 보호자 질문 + 상위 5개 후보 문장
출력: 환자 말투를 반영한 답변 4개

규칙:
- 환자 과거 표현·말투 유지
- 반말 구어체
- 15자 이내
- 보호자 질문에 직접 답변
```

---

## 파일 구조

```
right_sentence/
├── main.py                   # 메인 실행 (테스트 케이스 포함)
├── recommendation.py         # 추천 파이프라인 통합
├── embedding_service.py      # Bi-encoder (GMS/로컬 자동 전환)
├── cross_encoder_service.py  # Cross-encoder 재랭킹
├── vector_db.py              # FAISS 벡터 DB
├── llm_service.py            # LLM 재구성 (GMS/템플릿 자동 전환)
├── dataset_builder.py        # AI Hub 데이터 → general_sentences.json
├── data_generator.py         # 샘플 데이터 생성 (user_sentences.json)
├── requirements.txt
├── .env
└── data/
    ├── user_sentences.json       # 환자 과거 발화 (50개 샘플)
    ├── general_sentences.json    # 일반 대화 문장 (AI Hub 1,800개)
    ├── Training/                 # AI Hub 원본 (9개 카테고리)
    └── Validation/               # AI Hub 원본 (9개 카테고리)
```

---

## 데이터셋

### user_sentences.json (환자 과거 문장)
```json
{
  "user_id": 1,
  "text": "나 이정호 응원했어",
  "usage_count": 15,
  "created_at": "2024-03-01"
}
```

### general_sentences.json (일반 대화 문장)
- 출처: AI Hub 한국어 대화 요약 데이터셋
- Training + Validation 총 발화에서 추출
- 필터: 2~30자, 중복 제거
- 카테고리별 200개 × 9개 = **1,800개**

| 카테고리 | 파일 | 문장 수 |
|---------|------|--------|
| 식음료 | food_drink.json | 200 |
| 개인및관계 | personal_relations.json | 200 |
| 미용과건강 | beauty_health.json | 200 |
| 상거래 | commerce_shopping.json | 200 |
| 시사교육 | news_education.json | 200 |
| 여가생활 | leisure.json | 200 |
| 일과직업 | work_job.json | 200 |
| 주거와생활 | housing_life.json | 200 |
| 행사 | events.json | 200 |

> `dataset_builder.py`의 `MAX_PER_CATEGORY` 값으로 수량 조정 가능

---

## 실행 방법

```bash
cd right_sentence

# 1. 패키지 설치
pip install -r requirements.txt

# 2. .env 설정
# USE_GMS=false        ← 로컬 테스트
# USE_GMS=true         ← GMS 사용 시
# GMS_KEY=your_key

# 3. 데이터 준비
python data_generator.py     # 환자 샘플 데이터 생성
python dataset_builder.py    # AI Hub → general_sentences.json 생성

# 4. 실행
python main.py
```

---

## 비용 예상 (GMS, USE_GMS=true)

### 벡터 DB 구축 1회
| 항목 | 문장 수 | 비용 |
|------|--------|------|
| 환자 문장 임베딩 | ~50개 | ~0.001 Credit |
| 일반 문장 임베딩 | ~1,800개 | ~0.002 Credit |
| **합계** | | **~0.003 Credit** |

### 추천 1회
| 항목 | 비용 |
|------|------|
| 쿼리 임베딩 | ~0.001 Credit |
| GPT-4o-mini 재구성 | ~0.01 Credit |
| **합계** | **~0.011 Credit/회** |

100회 사용 시 약 **1.1 Credit**

---

## 실험 결과 (로컬, USE_GMS=false)

### 환경
- Bi-encoder: `paraphrase-multilingual-MiniLM-L12-v2` (로컬, 384차원)
- Cross-encoder: `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` (로컬)
- LLM: 템플릿 반환 (상위 4개 그대로)
- 환자 문장 수: 50개 → Cold Start 조건: `user:6, general:14`

### 테스트 케이스 (예상 출력 형식)

```
테스트 1/4
보호자: "오늘 야구 경기 재밌었지?"
------------------------------------------------------------
추천 답변:
  1. 나 이정호 응원했어
  2. 9회 역전 짜릿했어
  3. 야구 경기 좋았어
  4. 홈런 쳤을 때 좋았어

테스트 2/4
보호자: "저녁 뭐 먹고 싶어?"
------------------------------------------------------------
추천 답변:
  1. 김치찌개 먹고 싶어
  2. 아무거나 좋아
  3. 고기 먹고 싶네
  4. 된장찌개 어때
```

### Windows 터미널 한글 깨짐 해결
```cmd
chcp 65001
python main.py
```
또는 `PYTHONIOENCODING=utf-8` 환경변수 설정.

---

## 알려진 제약사항

| 항목 | 내용 |
|------|------|
| 모델 다운로드 | 첫 실행 시 Cross-encoder 약 500MB 다운로드 |
| FAISS 휘발성 | 재시작 시 벡터 DB 재구축 필요 (인메모리) |
| TF 경고 | sentence-transformers가 TensorFlow 로드 시 oneDNN 경고 출력 (무시 가능) |
| 터미널 인코딩 | Windows cmd 기본값 cp949 → `chcp 65001` 필요 |
