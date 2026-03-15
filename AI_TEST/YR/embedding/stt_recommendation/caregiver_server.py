"""
caregiver_server.py - 보호자와의 대화 프로토타입 서버
기존 stt_server.py 기능 유지 + 카테고리 기반 개선 기능 추가
  - user_sentences2.json (pastExpressions, todayData 구조)
  - 로컬 임베딩 (paraphrase-multilingual-MiniLM-L12-v2)
  - GMS LLM (gpt-4o-mini) 후처리 + 카테고리 생성
  - 예린) 검색/단어 추천: Bi-encoder만 사용 (질문·문장 각각 임베딩 → 코사인 유사도). Cross-encoder 미사용.
포트: 5003
"""
import hashlib
import json
import math
import os
import random
import time
from datetime import datetime
from pathlib import Path
from collections import Counter
import numpy as np
from flask import Flask, jsonify, request, send_file
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

# 유사 문장에서 형태소로 단어 추출. konlpy 없거나 Java 미설치 시 기존(유사도+빈도) 로직 사용.
# Okt 끄기: 환경 변수 DISABLE_KONLPY=1 (또는 .env에 DISABLE_KONLPY=1)
_okt = None
if os.getenv("DISABLE_KONLPY", "").strip().lower() not in ("1", "true", "yes"):
    try:
        from konlpy.tag import Okt
        _okt = Okt()
        print("[초기화] 형태소 분석(Okt) 로드됨 → 단어 추천에 형태소 분석 추가 적용")
    except Exception as e:
        _okt = None
        err_msg = str(e).strip() or type(e).__name__
        if "JVM" in err_msg or "java" in err_msg.lower() or "JAVA_HOME" in err_msg:
            print("[초기화] konlpy 미사용 (Java/JVM 미설치) → 단어 추천은 keywords+N-gram+최근성+유사도·빈도 로직 사용")
            print("           (선택) JDK 설치 + JAVA_HOME 설정 시 형태소 분석(Okt) 적용 가능")
        else:
            print("[초기화] konlpy 미사용 → 단어 추천은 keywords+N-gram+최근성+유사도·빈도 로직 사용 (형태소 분석 제외)")
            print(f"           원인: {err_msg[:80]}")
else:
    print("[초기화] konlpy 미사용 (DISABLE_KONLPY 설정) → 단어 추천은 keywords+N-gram+최근성+유사도·빈도 로직 사용")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR  = BASE_DIR / "data"

app = Flask(__name__)

# ====== GMS LLM 설정 ======
GMS_KEY = os.getenv("GMS_KEY", "")
llm_client = OpenAI(
    api_key=GMS_KEY,
    base_url="https://gms.ssafy.io/gmsapi/api.openai.com/v1"
)

# ====== 로컬 임베딩 모델 ======
# 예린) Bi-encoder: 질문과 문장을 각각 같은 모델로 벡터화한 뒤 코사인 유사도로 검색. Cross-encoder(질문+문장 한꺼번에 넣는 재랭킹)는 이 서버에서 미사용.
print("[초기화] 임베딩 모델 로딩 중...")
embed_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
print("[초기화] 임베딩 모델 로딩 완료")


# ====== 데이터 로드 (1순위: 멀티 유저 지원) ======
DEFAULT_USER_ID = "patient_001"
user_data_cache = {}  # {user_id: {today_data, user_db, word_lists, word_usage_freq}}

# 일반 말뭉치: 전체 공용, 기동 시 1회 로드
general_db = []
general_with_sentiment = DATA_DIR / "general_sentences_with_sentiment.json"
general_fallback = DATA_DIR / "general_sentences.json"
if general_with_sentiment.exists():
    with open(general_with_sentiment, "r", encoding="utf-8") as f:
        general_raw = json.load(f)
    general_db = [
        {"text": item["text"], "source": "general", "weight": 1.0, "sentiment": item.get("sentiment", "중립")}
        for item in general_raw
    ]
    print(f"[데이터 로드] 일반 DB (sentiment 포함): {len(general_db)}개")
elif general_fallback.exists():
    with open(general_fallback, "r", encoding="utf-8") as f:
        general_raw = json.load(f)
    general_db = [{"text": item["text"], "source": "general", "weight": 1.0} for item in general_raw]
    print(f"[데이터 로드] 일반 DB (sentiment 없음): {len(general_db)}개")


def _load_user_data(user_id: str) -> dict | None:
    """user_id별 데이터 로드. 캐시 있으면 반환, 없으면 파일에서 로드 후 캐시. 실시간 반영을 위해 추후 캐시 무효화 연동 가능."""
    if user_id in user_data_cache:
        return user_data_cache[user_id]
    # 1) data/users/{user_id}.json 2) user_id가 patient_001일 때만 data/user/als_patient_dataset.json 폴백
    path = DATA_DIR / "users" / f"{user_id}.json"
    if not path.exists() and user_id == DEFAULT_USER_ID:
        path = DATA_DIR / "user" / "als_patient_dataset.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        user_raw = json.load(f)
    today_data = user_raw.get("todayData", {})
    expressions = user_raw.get("pastExpressions", [])
    user_db = [
        {
            "text": item["text"],
            "source": "user",
            "sentiment": item.get("sentiment", "중립"),
            "categories": item.get("categories", []),
            "keywords": item.get("keywords", []),
            "weight": 1.0 + math.log(item.get("usageCount", 1) + 1),
            "lastUsed": item.get("lastUsed"),  # 시간대 가중치용
        }
        for item in expressions
    ]
    past_words = user_raw.get("pastWords")
    default_word_lists = {
        "subjects": ["나", "우리", "손녀딸", "딸", "여보"],
        "objects": ["물", "음식", "약"],
        "verbs": ["먹다", "마시다", "보다", "좋아하다"],
        "punctuation": [".", "!", "?"]
    }
    if isinstance(past_words, dict) and past_words.get("subjects") is not None:
        word_lists = {k: list(v) if isinstance(v, list) else v for k, v in past_words.items()}
        if "punctuation" not in word_lists or not word_lists["punctuation"]:
            word_lists["punctuation"] = default_word_lists["punctuation"]
    else:
        word_lists = default_word_lists.copy()
    all_words_set = set()
    for cat in ("subjects", "objects", "verbs"):
        all_words_set |= set(word_lists.get(cat, []))
    word_usage_freq = {}
    for item in expressions:
        weight = item.get("usageCount", 1)
        for kw in item.get("keywords", []):
            if kw in all_words_set:
                word_usage_freq[kw] = word_usage_freq.get(kw, 0) + weight
        for token in item.get("text", "").replace("?", " ").replace(".", " ").split():
            if token in all_words_set:
                word_usage_freq[token] = word_usage_freq.get(token, 0) + weight
    result = {
        "today_data": today_data,
        "user_db": user_db,
        "word_lists": word_lists,
        "word_usage_freq": word_usage_freq,
    }
    user_data_cache[user_id] = result
    return result


def _invalidate_user_cache(user_id: str | None = None) -> None:
    """실시간 반영용: 해당 유저 캐시 삭제. user_id 없으면 전체 삭제."""
    if user_id is None:
        user_data_cache.clear()
    elif user_id in user_data_cache:
        del user_data_cache[user_id]


def _get_user_file_path(user_id: str) -> Path | None:
    """user_id에 해당하는 JSON 파일 경로. 없으면 None."""
    path = DATA_DIR / "users" / f"{user_id}.json"
    if not path.exists() and user_id == DEFAULT_USER_ID:
        path = DATA_DIR / "user" / "als_patient_dataset.json"
    return path if path.exists() else None

# ====== 임베딩 캐시 ======
embedding_cache: dict = {}


# 예린) Bi-encoder용: 텍스트(질문 또는 문장) 하나를 벡터로 인코딩. 질문/문장 구분 없이 동일 모델 사용.
def get_embedding(text: str) -> np.ndarray:
    if text not in embedding_cache:
        embedding_cache[text] = embed_model.encode(text, convert_to_numpy=True)
    return embedding_cache[text]


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


# 예린) 일반 DB만 기동 시 사전 인코딩. 유저별 문장/단어는 첫 요청 시 embedding_cache에 쌓임.
def precompute_embeddings():
    all_texts = [item["text"] for item in general_db]
    print(f"[초기화] 임베딩 사전 계산 중 (general_db): {len(all_texts)}개")
    for text in all_texts:
        get_embedding(text)
    print("[초기화] 완료")


# ====== 검색 ======
# 3순위: 시간대 가중치 (같은 시간대/요일에 썼던 표현 보정)
def _calculate_temporal_boost(item: dict, current_hour: int, current_weekday: int) -> float:
    """lastUsed가 있으면 현재 시각·요일과 겹칠수록 1.0 초과 가중치. 없으면 1.0."""
    last_used = item.get("lastUsed")
    if not last_used:
        return 1.0
    try:
        s = last_used.replace("Z", "").split("+")[0].strip()
        dt = datetime.fromisoformat(s)
        if dt.hour == current_hour:
            return 1.2
        if dt.weekday() == current_weekday:
            return 1.1
    except Exception:
        pass
    return 1.0


# 예린) Bi-encoding: 질문 1번 인코딩(q_vec), 각 문장 인코딩 후 cosine_sim(q_vec, 문장벡터)로 유사도 계산 → 상위 k개.
def _search_sentences(question: str, user_db: list, sentiment_filter: str | None = None, intent_filter: str | None = None, k: int = 5) -> list:
    """user_db에서 가중치 유사도 검색. sentiment 1차 필터 + intent(pastExpressions.categories) 보정 + 시간대 가중치."""
    pool = user_db
    if sentiment_filter:
        filtered = [item for item in user_db if item["sentiment"] == sentiment_filter]
        if len(filtered) >= k:
            pool = filtered
    now = datetime.now()
    current_hour = now.hour
    current_weekday = now.weekday()
    q_vec = get_embedding(question)
    results = []
    for item in pool:
        sim = cosine_sim(q_vec, get_embedding(item["text"]))
        base_score = sim * item["weight"]
        temporal_weight = _calculate_temporal_boost(item, current_hour, current_weekday)
        intent_boost = 1.5 if (intent_filter and item.get("categories") and intent_filter in item["categories"]) else 1.0
        results.append({
            "text":   item["text"],
            "score":  base_score * temporal_weight * intent_boost,
            "source": item["source"],
        })
    seen, deduped = set(), []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        if r["text"] not in seen:
            seen.add(r["text"])
            deduped.append(r)
    return deduped[:k]


# 예린) Bi-encoding 동일: 질문 벡터와 일반 DB 문장 벡터 코사인 유사도로 상위 k개.
def _search_general(question: str, k: int = 3, sentiment_filter: str | None = None) -> list:
    """일반 DB에서 질문과 유사도 순 상위 k개. general_db에 sentiment 있으면 sentiment_filter로 필터링 후 유사도."""
    if not general_db:
        return []
    pool = general_db
    if sentiment_filter is not None and "sentiment" in general_db[0]:
        pool = [item for item in general_db if item.get("sentiment") == sentiment_filter]
        if not pool:
            return []
    q_vec = get_embedding(question)
    results = []
    for item in pool:
        # 예린) 질문이랑 각 문장 벡터 간의 유사도 계산
        sim = cosine_sim(q_vec, get_embedding(item["text"]))
        results.append({"text": item["text"], "score": sim * item["weight"], "source": item["source"]})
    seen, deduped = set(), []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        if r["text"] not in seen:
            seen.add(r["text"])
            deduped.append(r)
    return deduped[:k]


def _search_sentences_mixed(question: str, user_db: list, sentiment_filter: str | None = None, intent_filter: str | None = None, k_total: int = 6) -> list:
    """sentiment 있을 때: general_db에 sentiment 있으면 50% user + 50% general. intent_filter 있으면 user_db 검색 시 의도 일치 문장 가산."""
    if sentiment_filter is not None:
        general_has_sentiment = general_db and "sentiment" in general_db[0]
        if general_has_sentiment:
            k_user = (k_total + 1) // 2
            k_general = k_total - k_user
            user_candidates = _search_sentences(question, user_db, sentiment_filter, intent_filter=intent_filter, k=k_user)
            general_candidates = _search_general(question, k=k_general, sentiment_filter=sentiment_filter)
            merged = user_candidates + general_candidates
            return merged[:k_total]
        return _search_sentences(question, user_db, sentiment_filter, intent_filter=intent_filter, k=k_total)
    k_user = (k_total + 1) // 2
    k_general = k_total - k_user
    user_candidates = _search_sentences(question, user_db, None, intent_filter=intent_filter, k=k_user)
    general_candidates = _search_general(question, k=k_general)
    merged = user_candidates + general_candidates
    return merged[:k_total]


# ----- 단어 추천: 후보 추출 → LLM 필터 → pastWords 보충 -----
# 1) 유사 문장의 keywords + 형태소로 후보를 넉넉히 뽑고
# 2) LLM에게 "이 중에서 주어/목적어/서술어로 쓸 수 있는 것만 골라줘" 필터링
# 3) 부족분은 pastWords에서 유사도+빈도 순으로 채움

# 동사 판별: keywords에서 "다"로 끝나면 동사/형용사
VERB_SUFFIXES = ("다",)

# 형태소 분석 불용어
_NOUN_STOPWORDS = frozenset({"것", "수", "때", "거", "등", "데", "지", "게"})

# LLM 단어 필터 캐시: (질문, 카테고리) → 필터링된 단어 리스트
_word_filter_cache: dict = {}


def _extract_keywords_from_similar(similar_results: list, user_db: list, category: str) -> list:
    """유사 문장의 keywords에서 카테고리에 맞는 단어 추출 (빈도순).
    similar_results: _search_sentences의 반환값 (외부에서 한 번만 호출해서 전달).
    - subjects/objects → "다"로 안 끝나는 것 (명사)
    - verbs → "다"로 끝나는 것 (동사/형용사)"""
    similar_texts = {s["text"] for s in similar_results}
    counter = Counter()
    for item in user_db:
        if item["text"] in similar_texts:
            for kw in item.get("keywords", []):
                if not kw:
                    continue
                is_verb = any(kw.endswith(s) for s in VERB_SUFFIXES)
                if category == "verbs" and is_verb:
                    counter[kw] += 1
                elif category in ("subjects", "objects") and not is_verb:
                    counter[kw] += 1
    return [w for w, _ in counter.most_common()]


def _extract_words_by_pos(sentences: list, category: str) -> list:
    """형태소 분석(Okt)으로 유사 문장에서 명사/동사 추출. norm=True로 원형 변환."""
    if not _okt or not sentences:
        return []
    NOUN_TAGS = ("Noun",)
    VERB_TAGS = ("Verb", "Adjective")
    counter = Counter()
    for text in sentences:
        text = (text or "").strip()
        if not text:
            continue
        try:
            pos_list = _okt.pos(text, norm=True)
        except Exception:
            continue
        if category in ("subjects", "objects"):
            for word, tag in pos_list:
                if tag in NOUN_TAGS and word and word not in _NOUN_STOPWORDS:
                    counter[word] += 1
        elif category == "verbs":
            for word, tag in pos_list:
                if tag in VERB_TAGS and word:
                    counter[word] += 1
    return [w for w, _ in counter.most_common()]


def _llm_filter_words(question: str, candidates: list, category: str) -> list:
    """LLM에게 후보 단어 중 카테고리에 맞는 것만 골라달라고 요청. 캐싱 적용.
    - subjects → 주어로 쓸 수 있는 명사 (사람, 신체부위 등)
    - objects → 목적어로 쓸 수 있는 명사 (사물, 음식, 장소 등)
    - verbs → 서술어로 쓸 수 있는 동사·형용사
    실패 시 후보를 그대로 반환."""
    if not candidates:
        return []

    # 캐시 확인: 같은 질문+카테고리면 LLM 호출 생략
    cache_key = (question.strip(), category, tuple(candidates))
    if cache_key in _word_filter_cache:
        return _word_filter_cache[cache_key]

    category_desc = {
        "subjects": "주어로 쓸 수 있는 명사(사람, 신체부위 등)만",
        "objects": "목적어로 쓸 수 있는 명사(사물, 음식, 장소, 행위 대상 등)만",
        "verbs": "서술어로 쓸 수 있는 동사·형용사만 (원형, '다'로 끝나는 형태)",
    }.get(category, "적절한 단어만")

    prompt = f"""보호자 질문: "{question}"
후보 단어: {json.dumps(candidates, ensure_ascii=False)}

위 후보 중에서 {category_desc} 골라주세요.
- 부사(많이, 아직도, 오늘 등), 어미, 조사, 감탄사는 제외
- 해당하는 단어가 없으면 빈 배열 []
- JSON 배열만 출력, 다른 텍스트 없이"""

    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "JSON 배열만 출력하세요."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=150, temperature=0.1,
        )
        raw = (resp.choices[0].message.content or "").strip()
        # 마크다운 코드블록 제거
        for prefix in ("```json", "```"):
            if raw.startswith(prefix):
                raw = raw[len(prefix):].strip()
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        result = json.loads(raw)
        if isinstance(result, list):
            # 후보에 있던 것만, 후보 순서 유지
            candidate_set = set(candidates)
            filtered = [w for w in result if isinstance(w, str) and w in candidate_set]
            _word_filter_cache[cache_key] = filtered
            return filtered
    except Exception as e:
        print(f"[LLM 단어 필터 실패] {e}")

    # LLM 실패 시 후보 그대로 반환 (캐싱 안 함 → 다음에 재시도)
    return candidates


# 단어 추천 맥락 반영: 이전 단계에서 선택한 단어와의 유사도 가산 (α)
_WORD_CONTEXT_ALPHA = 0.4


def _search_words(question: str, category: str, word_lists: dict, word_usage_freq: dict, user_db: list, k: int = 5, offset: int = 0, selected_words: dict | None = None) -> list:
    """단어 추천 (3단 구조 + LLM 필터 + 선택 단어 맥락 보정):
    1단계: 유사 문장의 keywords + 형태소로 후보 추출
    2단계: LLM 필터
    3단계: pastWords 나머지를 유사도+빈도+이전 선택 단어와의 유사도(context_boost)로 정렬
    """
    if category == "punctuation":
        return list(word_lists.get("punctuation", [".", "!", "?"]))

    fallback_list = word_lists.get(category, [])
    if not fallback_list:
        return []

    # --- 1단계: 유사 문장 한 번만 검색하고 keywords + 형태소 양쪽에 공유 ---
    similar_results = _search_sentences(question, user_db, sentiment_filter=None, k=15)
    extracted_keywords = _extract_keywords_from_similar(similar_results, user_db, category)

    extracted_pos = []
    if _okt:
        similar_texts = [c["text"] for c in similar_results]
        extracted_pos = _extract_words_by_pos(similar_texts, category)

    # 중복 제거하며 병합
    seen = set()
    raw_candidates = []
    for w in extracted_keywords + extracted_pos:
        if w not in seen:
            seen.add(w)
            raw_candidates.append(w)

    # --- 2단계: LLM 필터 (캐싱) ---
    filtered = _llm_filter_words(question, raw_candidates, category)

    # --- 3단계: pastWords 나머지 정렬 (유사도+빈도 + 이전 선택 단어와의 유사도 가산) ---
    filtered_set = set(filtered)
    remainder = [w for w in fallback_list if w not in filtered_set]
    q_vec = get_embedding(question)
    max_freq = max((word_usage_freq.get(w, 0) for w in remainder), default=1)
    selected_vectors = []
    if selected_words and isinstance(selected_words, dict):
        for key in ("subjects", "objects", "verbs"):
            v = selected_words.get(key)
            if v and isinstance(v, str) and v.strip():
                selected_vectors.append(get_embedding(v.strip()))

    def score(w: str) -> float:
        sim = cosine_sim(q_vec, get_embedding(w))
        norm_freq = (word_usage_freq.get(w, 0) / max_freq) if max_freq else 0
        base = sim * (1.0 + 0.5 * norm_freq)
        context_boost = 1.0
        if selected_vectors:
            w_vec = get_embedding(w)
            context_boost = 1.0 + _WORD_CONTEXT_ALPHA * max((cosine_sim(sv, w_vec) for sv in selected_vectors), default=0.0)
        return base * context_boost

    remainder_sorted = sorted(remainder, key=score, reverse=True)
    pool = filtered + remainder_sorted

    if not pool:
        return fallback_list[:k]

    if offset:
        rest = pool[offset:] or pool
        random.shuffle(rest)
        return rest[:k]
    return pool[:k]


# ====== LLM 후처리 ======
def _refine_recommend(question: str, candidates: list, sentiment_context: str | None = None) -> list:
    """검색 결과를 LLM으로 정제 → 추천 문장 3개. sentiment_context 있으면 그 감정 방향으로만 생성."""
    texts  = [c["text"] for c in candidates]
    diversity_rule = (
        "이번 답변은 모두 같은 방향(긍정 또는 부정/중립)으로 통일하세요."
        if sentiment_context
        else "긍정 1개, 부정/중립 2개로 다양하게"
    )
    prompt = f"""보호자 질문: "{question}"
환자가 과거에 자주 쓴 표현:
{chr(10).join(f"- {t}" for t in texts)}

위 표현들을 참고해서 질문에 어울리는 자연스러운 환자 답변을 정확히 3개 만드세요.
- 보호자 질문 시제/맥락에 맞게 (과거 질문→과거형, 현재→현재형)
- 반말 구어체, 15자 이내
- {diversity_rule}
- 번호나 기호 없이 줄바꿈으로만 구분하여 3개 출력"""
    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system",  "content": "ALS 환자 답변 생성 전문가. 요청한 개수만큼만 출력."},
                {"role": "user",    "content": prompt},
            ],
            max_tokens=100, temperature=0.7,
        )
        lines = [s.strip() for s in resp.choices[0].message.content.strip().split("\n") if s.strip()][:3]
    except Exception:
        lines = []
    fallback = [c["text"] for c in candidates]
    while len(lines) < 3:
        lines.append(fallback[len(lines) % len(fallback)] if fallback else "응")
    return lines


def _generate_from_words(words: list, question: str) -> list:
    """선택된 단어들로 문장 3개 생성"""
    punct_set     = {".", "!", "?"}  
    punct         = "".join(w for w in words if w in punct_set)
    content_words = [w for w in words if w not in punct_set and w != "없음"]

    prompt = f"""보호자 질문: "{question}"
선택된 단어: {', '.join(content_words)}
문장 끝 부호: {punct if punct else '없음'}

위 단어들로 환자가 답할 법한 자연스러운 한국어 문장을 정확히 3개 만드세요.
- 보호자 질문 시제에 맞게 (과거형/현재형)
- 반말 구어체, 15자 이내
- 지정된 문장 부호로 끝내기
- 번호나 기호 없이 줄바꿈으로만 구분하여 3개 출력"""
    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system",  "content": "ALS 환자 답변 생성 전문가. 요청한 개수만큼만 출력."},
                {"role": "user",    "content": prompt},
            ],
            max_tokens=120, temperature=0.8,
        )
        lines = [s.strip() for s in resp.choices[0].message.content.strip().split("\n") if s.strip()][:3]
    except Exception:
        lines = []

    verb_map = {
        "응원하다": "응원했어", "보다": "봤어", "좋아하다": "좋아했어",
        "싫어하다": "싫었어",  "먹다": "먹었어", "마시다": "마셨어",
        "듣다": "들었어",      "생각하다": "생각했어", "즐기다": "즐거웠어",
        "기억하다": "기억해",  "쉬다": "쉬었어", "힘들다": "힘들었어",
    }
    fallback = " ".join(verb_map.get(w, w) for w in content_words if w) + punct
    while len(lines) < 3:
        lines.append(fallback or "응")
    return lines


#  LLM 캐싱 (같은 질문 반복 시 비용·속도·일관성 개선)
category_cache = {}

# 감정 키워드: LLM이 sentimentMap에 누락한 카테고리 자동 추정용 (추가 LLM 호출 없음)
_POSITIVE_KEYWORDS = {"좋", "행복", "예", "맛있", "먹고 싶", "기쁘", "신나", "편하", "괜찮"}
_NEGATIVE_KEYWORDS = {"싫", "아니", "슬프", "아파", "화", "나쁨", "별로", "힘들", "불편", "우울"}


def _infer_sentiment(category_label: str) -> str:
    """카테고리 라벨에서 감정을 자동 추정. 긍정/부정 키워드 매칭, 없으면 중립."""
    for kw in _POSITIVE_KEYWORDS:
        if kw in category_label:
            return "긍정"
    for kw in _NEGATIVE_KEYWORDS:
        if kw in category_label:
            return "부정"
    return "중립"


def _generate_categories(question: str, user_db: list | None = None, max_categories: int = 4) -> dict:
    """
    보호자 질문 → LLM이 질문 유형(닫힌/개방형)을 판별하고 카테고리+sentimentMap 생성. 호출 1회로 통합.
    user_db가 있으면 유사 문장의 keywords/표현을 힌트로 넘겨 개방형 시 구체적 선택지 생성.
    반환: {"categories": [...], "sentimentMap": {...}}
    """
    cache_key = hashlib.md5(question.strip().encode()).hexdigest()
    if cache_key in category_cache:
        return category_cache[cache_key]

    all_keywords = []
    hint_texts = []
    if user_db:
        similar = _search_sentences(question, user_db, sentiment_filter=None, k=12)
        similar_texts = {s["text"] for s in similar}
        seen = set()
        for item in user_db:
            if item["text"] in similar_texts:
                for kw in item.get("keywords", []):
                    if kw and kw not in seen:
                        seen.add(kw)
                        all_keywords.append(kw)
        hint_texts = [s["text"] for s in similar[:6]]

    prompt = f"""보호자 질문: "{question}"

이 질문이 **닫힌 질문**(예/아니오, 좋아/싫어 등으로 답하는지)인지 **개방형 질문**(무엇/어디/어떤 등으로 구체적 답을 구하는지) 스스로 판단한 뒤, 적절한 답변 카테고리를 2~{max_categories}개 생성하세요.

[환자 과거 데이터 참고]
관련 키워드: {json.dumps(all_keywords[:20], ensure_ascii=False)}
관련 표현: {json.dumps(hint_texts, ensure_ascii=False)}

[카테고리 생성 규칙]
- **닫힌 질문**: [예, 아니오], [좋아, 싫어, 그저그래], [아파, 안 아파, 조금 아파], [행복, 슬픔, 그저그래] 등 질문에 맞는 고정 선택지
- **개방형 질문**: 위 환자 키워드/표현을 참고해 구체적 선택지(음식명, 장소, 활동 등) 제공. 마지막에 "잘 모르겠어" 또는 "다른 거" 1개 포함
- 공통: 카테고리 라벨은 짧게(4글자 이내 권장). 각 카테고리에 sentiment(긍정/부정/중립)와 intent(의도) 지정
- intent 예시: 통증, 욕구, 감정, 음식, 요청, 일상, 기타 (해당 카테고리가 어떤 의도인지 한 단어로)

반드시 이 JSON 형식만 출력:
{{"categories": ["카테고리1", "카테고리2", ...], "sentimentMap": {{"카테고리1": "긍정", "카테고리2": "중립"}}, "intentMap": {{"카테고리1": "통증", "카테고리2": "욕구"}}}}"""

    fallback_result = {
        "categories": ["좋아", "싫어", "그저그래"],
        "sentimentMap": {"좋아": "긍정", "싫어": "부정", "그저그래": "중립"},
        "intentMap": {"좋아": "감정", "싫어": "감정", "그저그래": "감정"}
    }
    for attempt in range(3):
        try:
            resp = llm_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "JSON만 출력하세요. 다른 텍스트 없이."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=200,
                temperature=0.3,
            )
            raw = (resp.choices[0].message.content or "").strip()
            for prefix in ("```json", "```"):
                if raw.startswith(prefix):
                    raw = raw[len(prefix):].strip()
            if raw.endswith("```"):
                raw = raw[:-3].strip()
            result = json.loads(raw)
            if "categories" not in result or "sentimentMap" not in result:
                raise ValueError("Invalid format")
            sentiment_map = result["sentimentMap"]
            for cat in result["categories"]:
                if cat not in sentiment_map:
                    sentiment_map[cat] = _infer_sentiment(cat)
            result["sentimentMap"] = sentiment_map
            if "intentMap" not in result:
                result["intentMap"] = {}
            intent_map = result["intentMap"]
            for cat in result["categories"]:
                if cat not in intent_map or not intent_map[cat]:
                    intent_map[cat] = "기타"
            result["intentMap"] = intent_map
            category_cache[cache_key] = result
            return result
        except Exception as e:
            print(f"[카테고리 생성 실패 attempt {attempt + 1}/3] {e}")
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
    return fallback_result


# ====== API 엔드포인트 ======

@app.route("/")
def index():
    return send_file(BASE_DIR / "caregiver_prototype.html")


@app.route("/debug/word_sources", methods=["GET"])
def debug_word_sources():
    """데이터 출처 확인용. 쿼리: ?user_id=patient_001 (없으면 기본 유저)."""
    user_id = request.args.get("user_id", DEFAULT_USER_ID)
    user_data = _load_user_data(user_id)
    if not user_data:
        return jsonify({"error": "user not found", "user_id": user_id}), 404
    return jsonify({
        "user_id": user_id,
        "subjects": user_data["word_lists"].get("subjects", []),
        "subjects_count": len(user_data["word_lists"].get("subjects", [])),
    })


@app.route("/today", methods=["GET"])
def get_today():
    """환자 먼저 시작 모드용: todayData 반환. 쿼리: ?user_id=patient_001"""
    user_id = request.args.get("user_id", DEFAULT_USER_ID)
    user_data = _load_user_data(user_id)
    if not user_data:
        return jsonify({"error": "user not found", "user_id": user_id}), 404
    return jsonify(user_data["today_data"])


@app.route("/cache/invalidate", methods=["POST"])
def invalidate_cache():
    """2순위 실시간 반영용: 해당 유저 캐시 삭제. body: {"user_id": "patient_001"} (user_id 없으면 전체 삭제)."""
    data = request.json or {}
    user_id = data.get("user_id")
    _invalidate_user_cache(user_id)
    return jsonify({"ok": True, "message": "cache invalidated"})

def _auto_generate_keywords(text: str) -> list:
# 문장에서 키워드 자동 추출합니다. Okt 있으면 명사+동사/형용사 원형, 없으면 2글자 이상 토큰

	if _okt:
		try:
			pos_list = _okt.pos(text, norm=True)
			keywords = []
			for word, tag in pos_list:
				if tag == "Noun" and word and word not in _NOUN_STOPWORDS:
					keywords.append(word)
				elif tag in ("Verb", "Adjective") and word:
					# 원형에 '다' 붙여서 반환
					kw = word if word.endswith("다") else word + "다"
					keywords.append(kw)
			# 중복 제거, 순서 유지
			seen = set()
			return [w for w in keywords if not(w in seen or seen.add(w))]
		except Exception:
			pass
			
		# okt 없으면 2 글자 이상 토큰 반환
		return [t for t in text.replace("?", " ").replace(".", " ").split() if len(t) >= 2]





@app.route("/expressions/use", methods=["POST"])
def record_expression_use():
    """표현 사용 기록 → 파일 갱신 + 캐시 무효화.
    body: user_id(선택), text(필수), sentiment(선택), intent(선택).
    intent가 있으면 pastExpressions 항목의 categories에 저장되어 이후 intent_boost 검색에 반영됨."""
    data = request.json or {}
    user_id = data.get("user_id", DEFAULT_USER_ID)
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text 필수"}), 400
    path = _get_user_file_path(user_id)
    if not path:
        return jsonify({"error": "user not found", "user_id": user_id}), 404
    try:
        with open(path, "r", encoding="utf-8") as f:
            user_raw = json.load(f)
    except Exception as e:
        return jsonify({"error": "file read failed", "detail": str(e)}), 500
    expressions = user_raw.get("pastExpressions", [])
    now_iso = datetime.now().isoformat(timespec="seconds")
    found = False
    for item in expressions:
        if (item.get("text") or "").strip() == text:
            item["usageCount"] = item.get("usageCount", 0) + 1
            item["lastUsed"] = now_iso
            if data.get("sentiment"):
                item["sentiment"] = data["sentiment"]
            if data.get("intent") and data["intent"] not in item.get("categories", []):
                item.setdefault("categories", []).append(data["intent"])
            found = True
            break
    if not found:
        expressions.append({
            "text": text,
            "sentiment": data.get("sentiment", "중립"),
            "categories": [data["intent"]] if data.get("intent") else [],
            "keywords": _auto_generate_keywords(text),
            "usageCount": 1,
            "lastUsed": now_iso,
        })
    user_raw["pastExpressions"] = expressions
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(user_raw, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return jsonify({"error": "file write failed", "detail": str(e)}), 500
    _invalidate_user_cache(user_id)
    return jsonify({"ok": True, "message": "expression recorded", "user_id": user_id})


@app.route("/recommend", methods=["POST"])
def recommend():
    """질문 + 선택 감정/카테고리 → user_db 검색(intent 반영) → LLM 정제 → 추천 문장 3개."""
    data             = request.json or {}
    user_id          = data.get("user_id", DEFAULT_USER_ID)
    question         = data.get("question", "").strip()
    sentiment_filter = data.get("sentiment", None)
    selected_category = data.get("selected_category") or None
    if not question:
        return jsonify({"error": "질문을 입력하세요"}), 400
    user_data = _load_user_data(user_id)
    if not user_data:
        return jsonify({"error": "user not found", "user_id": user_id}), 404
    intent_filter = None
    if selected_category:
        cat_result = _generate_categories(question, user_data["user_db"])
        intent_filter = (cat_result.get("intentMap") or {}).get(selected_category)
    candidates = _search_sentences_mixed(question, user_data["user_db"], sentiment_filter, intent_filter=intent_filter, k_total=6)
    sentences  = _refine_recommend(question, candidates, sentiment_context=sentiment_filter)
    return jsonify({"sentences": sentences})


@app.route("/categories", methods=["POST"])
def categories():
    """보호자 질문 → 닫힌 질문이면 LLM 카테고리, 개방형(뭐/어떤/어디 등)이면 pastExpressions 기반 카테고리. body에 user_id (없으면 patient_001)."""
    data = request.json or {}
    question = (data.get("question") or "").strip()
    user_id = data.get("user_id", DEFAULT_USER_ID)
    if not question:
        return jsonify({"error": "질문을 입력하세요"}), 400
    user_data = _load_user_data(user_id)
    user_db = user_data["user_db"] if user_data else None
    result = _generate_categories(question, user_db)
    return jsonify({
        "categories":   result["categories"],
        "sentimentMap": result["sentimentMap"],
        "intentMap":    result.get("intentMap", {})
    })


@app.route("/words", methods=["POST"])
def get_words():
    """카테고리별 유사+사용빈도+이전 선택 단어 맥락 반영 단어 4개. body에 selected_words(선택) 있으면 맥락 가산."""
    data     = request.json or {}
    user_id  = data.get("user_id", DEFAULT_USER_ID)
    question = data.get("question", "").strip()
    category = data.get("category", "")
    selected_words = data.get("selected_words") or None
    if not question or not category:
        return jsonify({"error": "질문과 category 필요"}), 400
    user_data = _load_user_data(user_id)
    if not user_data:
        return jsonify({"error": "user not found", "user_id": user_id}), 404
    wl = user_data["word_lists"]
    if category not in wl:
        return jsonify({"error": "잘못된 category"}), 400
    words = _search_words(question, category, wl, user_data["word_usage_freq"], user_data["user_db"], k=4, selected_words=selected_words)
    return jsonify({"words": words})


@app.route("/words_all", methods=["POST"])
def get_words_all():
    """새로고침: 상위 4개 제외한 나머지에서 4개. selected_words 있으면 맥락 가산 적용."""
    data     = request.json or {}
    user_id  = data.get("user_id", DEFAULT_USER_ID)
    question = data.get("question", "").strip()
    category = data.get("category", "")
    selected_words = data.get("selected_words") or None
    if not question or not category:
        return jsonify({"error": "질문과 category 필요"}), 400
    user_data = _load_user_data(user_id)
    if not user_data:
        return jsonify({"error": "user not found", "user_id": user_id}), 404
    wl = user_data["word_lists"]
    if category not in wl:
        return jsonify({"error": "잘못된 category"}), 400
    if category == "punctuation":
        shuffled = list(wl["punctuation"])
        random.shuffle(shuffled)
        return jsonify({"words": shuffled[:4]})
    words = _search_words(question, category, wl, user_data["word_usage_freq"], user_data["user_db"], k=4, offset=4, selected_words=selected_words)
    return jsonify({"words": words})


@app.route("/generate", methods=["POST"])
def generate():
    """선택된 단어 → LLM 문장 3개 생성"""
    words    = request.json.get("words", [])
    question = request.json.get("question", "")
    if not words:
        return jsonify({"error": "단어를 선택하세요"}), 400
    sentences = _generate_from_words(words, question)
    return jsonify({"sentences": sentences})


if __name__ == "__main__":
    precompute_embeddings()
    print("\n서버 시작: http://localhost:5003\n")
    app.run(debug=False, port=5003)