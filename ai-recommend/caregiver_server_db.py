"""
caregiver_server_db.py - DB 기반 추천 서버
caregiver_server.py에서 JSON 로드 부분만 MySQL 조회로 교체.
추천 로직(임베딩, LLM, 검색, 단어 추천)은 동일.
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
import requests as http_requests
from metrics import measure_time, record_api_time, get_timing_summary, reset_timing, log_to_mlflow

load_dotenv()

# ====== BE API 설정 ======
BE_API_URL = os.getenv("BE_API_URL", "http://eyespeak-backend:8080/api/v1")
AI_API_KEY = os.getenv("AI_INTERNAL_API_KEY", "eyespeak-ai-internal-2026-s14e205")

def _be_headers():
    """BE API 호출 시 인증 헤더"""
    return {"X-AI-API-Key": AI_API_KEY, "Content-Type": "application/json"}


# ====== 형태소 분석 (선택) ======
_okt = None
if os.getenv("DISABLE_KONLPY", "").strip().lower() not in ("1", "true", "yes"):
    try:
        from konlpy.tag import Okt
        _okt = Okt()
        print("[초기화] 형태소 분석(Okt) 로드됨")
    except Exception:
        _okt = None
        print("[초기화] konlpy 미사용")
else:
    print("[초기화] konlpy 미사용 (DISABLE_KONLPY 설정)")

app = Flask(__name__)

# ====== 추천 지표 ======
_recommend_stats = {
    "recommend_calls": 0,
    "expression_use_total": 0,
    "expression_use_from_recommend": 0,
    "use_rank_1": 0, "use_rank_2": 0, "use_rank_3": 0,
}
_last_recommend_by_user = {}
_MAX_LAST_AGE_SEC = 300

# ====== GMS LLM ======
GMS_KEY = os.getenv("GMS_KEY", "")
llm_client = OpenAI(
    api_key=GMS_KEY,
    base_url="https://gms.ssafy.io/gmsapi/api.openai.com/v1"
)

# ====== 임베딩 모델 ======
print("[초기화] 임베딩 모델 로딩 중...")
embed_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
print("[초기화] 임베딩 모델 로딩 완료")

# ====== 임베딩 캐시 ======
embedding_cache: dict = {}


def get_embedding(text: str) -> np.ndarray:
    if text not in embedding_cache:
        embedding_cache[text] = embed_model.encode(text, convert_to_numpy=True)
    return embedding_cache[text]


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


# ====== BE API에서 데이터 로드 ======
SENTIMENT_MAP_REVERSE = {"POSITIVE": "긍정", "NEGATIVE": "부정", "NEUTRAL": "중립"}


@measure_time
def _load_user_data_from_db(matching_id: int) -> dict | None:
    """BE API로 환자 추천 컨텍스트 조회"""
    try:
        resp = http_requests.get(
            f"{BE_API_URL}/ai/user-context/{matching_id}",
            headers=_be_headers(), timeout=10)
        if resp.status_code != 200:
            print(f"[user-context] BE API 실패: {resp.status_code}")
            return None
        data = resp.json().get("data")
        if not data:
            return None

        user_db = []
        for expr in (data.get("userExpressions") or []):
            user_db.append({
                "text": expr["text"],
                "source": "user",
                "sentiment": SENTIMENT_MAP_REVERSE.get(expr.get("sentiment"), "중립"),
                "categories": [expr["category"]] if expr.get("category") else [],
                "keywords": expr.get("keywords") or [],
                "weight": 1.0 + math.log((expr.get("usageCount") or 0) + 1),
                "lastUsed": expr.get("lastUsed"),
            })

        word_lists = data.get("wordLists") or {
            "subjects": ["나", "우리", "손녀딸", "딸", "여보"],
            "objects": ["물", "음식", "약"],
            "verbs": ["먹다", "마시다", "보다", "좋아하다"],
            "punctuation": [".", "!", "?"],
        }

        # word_usage_freq 계산
        all_words_set = set()
        for cat in ("subjects", "objects", "verbs"):
            all_words_set |= set(word_lists.get(cat, []))
        word_usage_freq = {}
        for item in user_db:
            weight = item["weight"]
            for kw in item.get("keywords", []):
                if kw in all_words_set:
                    word_usage_freq[kw] = word_usage_freq.get(kw, 0) + weight
            for token in item["text"].replace("?", " ").replace(".", " ").split():
                if token in all_words_set:
                    word_usage_freq[token] = word_usage_freq.get(token, 0) + weight

        return {
            "today_data": data.get("todayData") or {},
            "user_db": user_db,
            "word_lists": word_lists,
            "word_usage_freq": word_usage_freq,
        }
    except Exception as e:
        print(f"[user-context] 에러: {e}")
        return None

def _load_general_db_from_db() -> list:
    """BE API에서 범용 말뭉치 로드"""
    try:
        resp = http_requests.get(
            f"{BE_API_URL}/ai/general-corpus",
            headers=_be_headers(), timeout=30)
        if resp.status_code != 200:
            print(f"[general-corpus] BE API 실패: {resp.status_code}")
            return []
        rows = resp.json().get("data") or []
        return [
            {
                "text": row["content"],
                "source": "general",
                "weight": float(row["weight"]) if row["weight"] else 1.0,
                "sentiment": SENTIMENT_MAP_REVERSE.get(row.get("sentiment"), "중립"),
            }
            for row in rows
        ]
    except Exception as e:
        print(f"[general-corpus] 에러: {e}")
        return []


# 기동 시 general_db 로드
print("[초기화] DB에서 general_corpus 로딩 중...")
general_db = _load_general_db_from_db()
print(f"[초기화] general_corpus: {len(general_db)}개 로드 완료")


def precompute_embeddings():
    all_texts = [item["text"] for item in general_db]
    print(f"[초기화] 임베딩 사전 계산 중 (general_db): {len(all_texts)}개")
    for text in all_texts:
        get_embedding(text)
    print("[초기화] 완료")


# ====== 검색 (caregiver_server.py와 동일) ======
def _calculate_temporal_boost(item: dict, current_hour: int, current_weekday: int) -> float:
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


@measure_time
def _search_sentences(question: str, user_db: list, sentiment_filter: str | None = None, intent_filter: str | None = None, k: int = 5) -> list:
    pool = user_db
    if sentiment_filter:
        filtered = [item for item in user_db if item["sentiment"] == sentiment_filter]
        if len(filtered) >= k:
            pool = filtered
    now = datetime.now()
    q_vec = get_embedding(question)
    results = []
    for item in pool:
        sim = cosine_sim(q_vec, get_embedding(item["text"]))
        base_score = sim * item["weight"]
        temporal_weight = _calculate_temporal_boost(item, now.hour, now.weekday())
        intent_boost = 1.5 if (intent_filter and intent_filter in (item.get("categories") or [])) else 1.0
        results.append({"text": item["text"], "score": base_score * temporal_weight * intent_boost, "source": item["source"]})
    seen, deduped = set(), []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        if r["text"] not in seen:
            seen.add(r["text"])
            deduped.append(r)
    return deduped[:k]


def _search_general(question: str, k: int = 3, sentiment_filter: str | None = None) -> list:
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
        sim = cosine_sim(q_vec, get_embedding(item["text"]))
        results.append({"text": item["text"], "score": sim * item["weight"], "source": item["source"]})
    seen, deduped = set(), []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        if r["text"] not in seen:
            seen.add(r["text"])
            deduped.append(r)
    return deduped[:k]


@measure_time
def _search_sentences_mixed(question: str, user_db: list, sentiment_filter: str | None = None, intent_filter: str | None = None, k_total: int = 6) -> list:
    if sentiment_filter is not None:
        general_has_sentiment = general_db and "sentiment" in general_db[0]
        if general_has_sentiment:
            k_user = (k_total + 1) // 2
            k_general = k_total - k_user
            user_candidates = _search_sentences(question, user_db, sentiment_filter, intent_filter=intent_filter, k=k_user)
            general_candidates = _search_general(question, k=k_general, sentiment_filter=sentiment_filter)
            return (user_candidates + general_candidates)[:k_total]
        return _search_sentences(question, user_db, sentiment_filter, intent_filter=intent_filter, k=k_total)
    k_user = (k_total + 1) // 2
    k_general = k_total - k_user
    user_candidates = _search_sentences(question, user_db, None, intent_filter=intent_filter, k=k_user)
    general_candidates = _search_general(question, k=k_general)
    return (user_candidates + general_candidates)[:k_total]


# ====== 단어 추천 (caregiver_server.py와 동일) ======
VERB_SUFFIXES = ("다",)
_NOUN_STOPWORDS = frozenset({
    "것", "수", "때", "거", "등", "데", "지", "게",
    "뿐", "줄", "리", "바", "셈", "탓", "채", "척", "만큼", "대로",
    "오늘", "내일", "어제", "지금", "아까", "나중", "항상", "매일",
    "많이", "조금", "아주", "너무", "정말", "진짜", "좀", "다시", "또",
    "이거", "그거", "저거", "여기", "거기", "저기",
    "안", "못", "잘", "더", "덜", "다",
})
MAX_WORDS_PER_CATEGORY = 50
_SUBJECT_WHITELIST = frozenset({
    "나", "우리", "저", "너", "여보", "엄마", "아빠", "아들", "딸",
    "손녀딸", "손자", "할머니", "할아버지", "언니", "오빠", "동생",
    "형", "누나", "아내", "남편", "선생님", "간호사", "의사",
    "친구", "이웃", "가족", "사람",
})
_FALSE_VERB_NOUNS = frozenset({
    "데이터", "소다", "캐나다", "레이더", "리더", "젠더", "폴더",
})
_WORD_CONTEXT_ALPHA = 0.4


def _extract_keywords_from_similar(similar_results: list, user_db: list, category: str) -> list:
    similar_texts = {s["text"] for s in similar_results}
    counter = Counter()
    for item in user_db:
        if item["text"] in similar_texts:
            for kw in (item.get("keywords") or []):
                if not kw:
                    continue
                is_verb = any(kw.endswith(s) for s in VERB_SUFFIXES)
                if category == "verbs" and is_verb:
                    counter[kw] += 1
                elif category in ("subjects", "objects") and not is_verb:
                    counter[kw] += 1
    return [w for w, _ in counter.most_common()]


def _extract_words_by_pos(sentences: list, category: str) -> list:
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


_word_filter_cache: dict = {}


@measure_time
def _llm_filter_words(question: str, candidates: list, category: str) -> list:
    if not candidates:
        return []
    cache_key = (question.strip(), category, tuple(candidates))
    if cache_key in _word_filter_cache:
        return _word_filter_cache[cache_key]
    category_desc = {
        "subjects": "주어로 쓸 수 있는 명사(사람, 신체부위 등)만",
        "objects": "목적어로 쓸 수 있는 명사(사물, 음식, 장소, 행위 대상 등)만",
        "verbs": "서술어로 쓸 수 있는 동사·형용사만 (원형, '다'로 끝나는 형태)",
    }.get(category, "적절한 단어만")
    prompt = f"""질문:"{question}"
후보:{json.dumps(candidates, ensure_ascii=False)}
{category_desc} 골라서 JSON배열만 출력.부사/어미/조사제외."""
    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {"role": "system", "content": "JSON 배열만 출력하세요."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=150, temperature=0.1,
        )
        raw = (resp.choices[0].message.content or "").strip()
        for prefix in ("```json", "```"):
            if raw.startswith(prefix):
                raw = raw[len(prefix):].strip()
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        result = json.loads(raw)
        if isinstance(result, list):
            candidate_set = set(candidates)
            filtered = [w for w in result if isinstance(w, str) and w in candidate_set]
            _word_filter_cache[cache_key] = filtered
            return filtered
    except Exception as e:
        print(f"[LLM 단어 필터 실패] {e}")
    return candidates


def _search_words(question: str, category: str, word_lists: dict, word_usage_freq: dict, user_db: list, k: int = 5, offset: int = 0, selected_words: dict | None = None) -> list:
    if category == "punctuation":
        return list(word_lists.get("punctuation", [".", "!", "?"]))
    fallback_list = word_lists.get(category, [])
    if not fallback_list:
        return []
    similar_results = _search_sentences(question, user_db, sentiment_filter=None, k=15)
    extracted_keywords = _extract_keywords_from_similar(similar_results, user_db, category)
    extracted_pos = []
    if _okt:
        similar_texts = [c["text"] for c in similar_results]
        extracted_pos = _extract_words_by_pos(similar_texts, category)
    seen = set()
    raw_candidates = []
    for w in extracted_keywords + extracted_pos:
        if w not in seen:
            seen.add(w)
            raw_candidates.append(w)
    filtered = _llm_filter_words(question, raw_candidates, category)
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


# ====== LLM 후처리 (caregiver_server.py와 동일) ======
_refine_cache: dict = {}

@measure_time
def _refine_recommend(question: str, candidates: list, sentiment_context: str | None = None) -> list:
    texts = [c["text"] for c in candidates]
    cache_key = (question.strip(), tuple(texts), sentiment_context)
    if cache_key in _refine_cache:
        return _refine_cache[cache_key]
    diversity_rule = (
        "이번 답변은 모두 같은 방향(긍정 또는 부정/중립)으로 통일하세요."
        if sentiment_context
        else "긍정 1개, 부정/중립 2개로 다양하게"
    )
    prompt = f"""질문:"{question}"
참고표현:{','.join(texts)}
반말구어체,15자이내,3개,줄바꿈구분,{diversity_rule}"""
    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {"role": "system", "content": "ALS환자답변생성.시제맞춤.번호없이줄바꿈만."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=60, temperature=0.7,
        )
        lines = [s.strip() for s in resp.choices[0].message.content.strip().split("\n") if s.strip()][:3]
    except Exception:
        lines = []
    fallback = [c["text"] for c in candidates]
    while len(lines) < 3:
        lines.append(fallback[len(lines) % len(fallback)] if fallback else "응")
    _refine_cache[cache_key] = lines
    return lines


@measure_time
def _generate_from_words(words: list, question: str) -> list:
    punct_set = {".", "!", "?"}
    punct = "".join(w for w in words if w in punct_set)
    content_words = [w for w in words if w not in punct_set and w != "없음"]
    prompt = f"""질문:"{question}"
단어:{','.join(content_words)}
부호:{punct if punct else '없음'}
반말구어체,15자이내,3개,줄바꿈구분,부호로끝내기"""
    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {"role": "system", "content": "ALS환자답변생성.시제맞춤.번호없이줄바꿈만."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=60, temperature=0.8,
        )
        lines = [s.strip() for s in resp.choices[0].message.content.strip().split("\n") if s.strip()][:3]
    except Exception:
        lines = []
    verb_map = {
        "응원하다": "응원했어", "보다": "봤어", "좋아하다": "좋아했어",
        "먹다": "먹었어", "마시다": "마셨어", "듣다": "들었어",
    }
    fallback = " ".join(verb_map.get(w, w) for w in content_words if w) + punct
    while len(lines) < 3:
        lines.append(fallback or "응")
    return lines


# ====== 카테고리 생성 (caregiver_server.py와 동일) ======
category_cache = {}
_POSITIVE_KEYWORDS = {"좋", "행복", "예", "맛있", "먹고 싶", "기쁘", "신나", "편하", "괜찮"}
_NEGATIVE_KEYWORDS = {"싫", "아니", "슬프", "아파", "화", "나쁨", "별로", "힘들", "불편", "우울"}


def _infer_sentiment(category_label: str) -> str:
    for kw in _POSITIVE_KEYWORDS:
        if kw in category_label:
            return "긍정"
    for kw in _NEGATIVE_KEYWORDS:
        if kw in category_label:
            return "부정"
    return "중립"


_INTENT_KEYWORD_ORDER = ("통증", "욕구", "음식", "요청", "감정", "일상", "기타")
_INTENT_KEYWORDS = {
    "통증": {"아파", "쑤시", "아프", "뻐근", "저리", "불편", "아픈", "쑤셔"},
    "욕구": {"먹고 싶", "마시고 싶", "하고 싶", "줘", "볼래", "주세요", "보고 싶"},
    "음식": {"밥", "물", "약", "간식", "맛", "배고파", "목말라", "먹었"},
    "요청": {"도와", "해줘", "바꿔", "켜줘", "꺼줘", "올려", "내려", "좀 줘"},
    "감정": {"좋아", "싫어", "슬프", "행복", "화나", "기쁘", "우울", "별로", "괜찮", "그저"},
    "일상": {"잘 잤", "피곤", "심심", "같이", "오늘"},
}


def _classify_sentence_keywords(text: str) -> tuple[str, str]:
    sentiment = _infer_sentiment(text)
    text_norm = (text or "").strip()
    for intent_label in _INTENT_KEYWORD_ORDER:
        if intent_label == "기타":
            continue
        keywords = _INTENT_KEYWORDS.get(intent_label, set())
        for kw in keywords:
            if kw in text_norm:
                return sentiment, intent_label
    return sentiment, "기타"


def _classify_sentence_llm(text: str) -> tuple[str, str]:
    prompt = f"""다음 문장의 sentiment(긍정/부정/중립)와 intent(통증/욕구/감정/음식/요청/일상/기타 중 하나)를 분류하세요.
문장: "{text}"
JSON만 출력: {{"sentiment": "부정", "intent": "감정"}}"""
    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[{"role": "system", "content": "JSON만 출력하세요."}, {"role": "user", "content": prompt}],
            max_tokens=50, temperature=0.1,
        )
        raw = (resp.choices[0].message.content or "").strip()
        for prefix in ("```json", "```"):
            if raw.startswith(prefix):
                raw = raw[len(prefix):].strip()
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        result = json.loads(raw)
        sent = result.get("sentiment") or "중립"
        if sent not in ("긍정", "부정", "중립"):
            sent = "중립"
        intent = result.get("intent") or "기타"
        if intent not in _INTENT_KEYWORD_ORDER:
            intent = "기타"
        return sent, intent
    except Exception:
        pass
    return "중립", "기타"


def _classify_sentence_for_storage(text: str) -> tuple[str, str]:
    sentiment, intent = _classify_sentence_keywords(text)
    if sentiment == "중립" and intent == "기타":
        sentiment, intent = _classify_sentence_llm(text)
    return sentiment, intent


SENTIMENT_MAP = {"긍정": "POSITIVE", "부정": "NEGATIVE", "중립": "NEUTRAL"}


def _auto_generate_keywords(text: str) -> list:
    if _okt:
        try:
            pos_list = _okt.pos(text, norm=True)
            keywords = []
            for word, tag in pos_list:
                if tag == "Noun" and word and word not in _NOUN_STOPWORDS:
                    keywords.append(word)
                elif tag in ("Verb", "Adjective") and word:
                    kw = word if word.endswith("다") else word + "다"
                    keywords.append(kw)
            seen = set()
            return [w for w in keywords if not (w in seen or seen.add(w))]
        except Exception:
            pass
    return [t for t in text.replace("?", " ").replace(".", " ").split() if len(t) >= 2]


@measure_time
def _generate_categories(question: str, user_db: list | None = None, max_categories: int = 4) -> dict:
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
                for kw in (item.get("keywords") or []):
                    if kw and kw not in seen:
                        seen.add(kw)
                        all_keywords.append(kw)
        hint_texts = [s["text"] for s in similar[:6]]
    prompt = f"""질문:"{question}"
키워드:{json.dumps(all_keywords[:10], ensure_ascii=False)}
표현:{json.dumps(hint_texts[:4], ensure_ascii=False)}
닫힌질문→[예,아니오]등 고정선택지. 개방형→키워드참고 구체선택지+마지막"잘모르겠어".
라벨4자이내,2~{max_categories}개,sentiment(긍정/부정/중립),intent지정.
JSON만:{{"categories":[],"sentimentMap":{{}},"intentMap":{{}}}}"""
    fallback_result = {
        "categories": ["좋아", "싫어", "그저그래"],
        "sentimentMap": {"좋아": "긍정", "싫어": "부정", "그저그래": "중립"},
        "intentMap": {"좋아": "감정", "싫어": "감정", "그저그래": "감정"}
    }
    for attempt in range(1):
        try:
            resp = llm_client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {"role": "system", "content": "JSON만 출력하세요. 다른 텍스트 없이."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=150, temperature=0.3,
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
            for cat in result["categories"]:
                if cat not in result["sentimentMap"]:
                    result["sentimentMap"][cat] = _infer_sentiment(cat)
            if "intentMap" not in result:
                result["intentMap"] = {}
            for cat in result["categories"]:
                if cat not in result["intentMap"]:
                    result["intentMap"][cat] = "기타"
            category_cache[cache_key] = result
            return result
        except Exception as e:
            print(f"[카테고리 생성 실패] {e}")
    return fallback_result


# ====== API 엔드포인트 ======

@app.route("/today", methods=["GET"])
def get_today():
    matching_id = request.args.get("matching_id", 1, type=int)
    user_data = _load_user_data_from_db(matching_id)
    if not user_data:
        return jsonify({"error": "matching not found"}), 404
    return jsonify(user_data["today_data"])


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json or {}
    matching_id = data.get("matching_id", 1)
    question = data.get("question", "").strip()
    sentiment_filter = data.get("sentiment", None)
    selected_category = data.get("selected_category") or None
    if not question:
        return jsonify({"error": "질문을 입력하세요"}), 400
    user_data = _load_user_data_from_db(matching_id)
    if not user_data:
        return jsonify({"error": "matching not found"}), 404
    intent_filter = None
    if selected_category:
        cat_result = _generate_categories(question, user_data["user_db"])
        intent_filter = (cat_result.get("intentMap") or {}).get(selected_category)
    candidates = _search_sentences_mixed(question, user_data["user_db"], sentiment_filter, intent_filter=intent_filter, k_total=6)
    sentences = _refine_recommend(question, candidates, sentiment_context=sentiment_filter)
    _recommend_stats["recommend_calls"] += 1
    _last_recommend_by_user[matching_id] = {"sentences": list(sentences), "at": datetime.now().isoformat()}
    return jsonify({"sentences": sentences})


@app.route("/categories", methods=["POST"])
def categories():
    data = request.json or {}
    question = (data.get("question") or "").strip()
    matching_id = data.get("matching_id", 1)
    if not question:
        return jsonify({"error": "질문을 입력하세요"}), 400
    user_data = _load_user_data_from_db(matching_id)
    user_db = user_data["user_db"] if user_data else None
    result = _generate_categories(question, user_db)
    return jsonify({
        "categories": result["categories"],
        "sentimentMap": result["sentimentMap"],
        "intentMap": result.get("intentMap", {})
    })


@app.route("/words", methods=["POST"])
def get_words():
    data = request.json or {}
    matching_id = data.get("matching_id", 1)
    question = data.get("question", "").strip()
    category = data.get("category", "")
    selected_words = data.get("selected_words") or None
    if not question or not category:
        return jsonify({"error": "질문과 category 필요"}), 400
    user_data = _load_user_data_from_db(matching_id)
    if not user_data:
        return jsonify({"error": "matching not found"}), 404
    wl = user_data["word_lists"]
    if category not in wl:
        return jsonify({"error": "잘못된 category"}), 400
    words = _search_words(question, category, wl, user_data["word_usage_freq"], user_data["user_db"], k=4, selected_words=selected_words)
    return jsonify({"words": words})


@app.route("/words_all", methods=["POST"])
def get_words_all():
    data = request.json or {}
    matching_id = data.get("matching_id", 1)
    question = data.get("question", "").strip()
    category = data.get("category", "")
    selected_words = data.get("selected_words") or None
    if not question or not category:
        return jsonify({"error": "질문과 category 필요"}), 400
    user_data = _load_user_data_from_db(matching_id)
    if not user_data:
        return jsonify({"error": "matching not found"}), 404
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
    words = request.json.get("words", [])
    question = request.json.get("question", "")
    if not words:
        return jsonify({"error": "단어를 선택하세요"}), 400
    sentences = _generate_from_words(words, question)
    return jsonify({"sentences": sentences})


@app.route("/expressions/classify", methods=["POST"])
def classify_expression():
    """문장 분류만 수행 (DB 저장 안 함 — BE가 저장)"""
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


# /recommend/hints 삭제됨 — BE가 RecommendationController에서 직접 DB 조회


@app.route("/recommend/category", methods=["POST"])
def recommend_by_category():
    """카테고리 기반 추천 문장 3개 생성 (환자 선발화)"""
    data = request.json or {}
    matching_id = data.get("matching_id", 1)
    recommend_type_raw = data.get("recommend_type", "")
    guardian_message = data.get("guardian_message")
    recent_messages = data.get("recent_messages")

    # 대소문자 모두 처리
    type_map = {
        "mood": "mood", "MOOD": "mood",
        "schedule": "schedule", "SCHEDULE": "schedule",
        "frequent": "frequent", "FREQUENT": "frequent",
        "recent": "recent", "RECENT": "recent",
    }
    recommend_type = type_map.get(recommend_type_raw)
    if not recommend_type:
        return jsonify({"error": f"잘못된 recommend_type: {recommend_type_raw}"}), 400

    user_data = _load_user_data_from_db(matching_id)
    if not user_data:
        return jsonify({"error": "matching not found"}), 404

    today_data = user_data["today_data"]
    user_db = user_data["user_db"]

    # 카테고리별 분기: 컨텍스트 질문 생성
    if recommend_type == "mood":
        mood = today_data.get("mood", "")
        mood_kr = {
            "HAPPY": "기분 좋음", "SAD": "슬픔", "CALM": "평온",
            "JOYFUL": "즐거움", "ANXIOUS": "불안", "ANGRY": "화남", "TIRED": "피곤"
        }.get(mood, "보통")
        context_question = f"환자의 오늘 기분은 '{mood_kr}'입니다. 이 기분에 맞는 표현을 추천해주세요."

    elif recommend_type == "schedule":
        schedule = today_data.get("schedule", [])
        hour = datetime.now().hour
        if hour < 9:
            slot_name = "기상/아침"
        elif hour < 12:
            slot_name = "오전"
        elif hour < 15:
            slot_name = "점심/낮"
        elif hour < 18:
            slot_name = "오후"
        elif hour < 21:
            slot_name = "저녁"
        else:
            slot_name = "취침준비"

        current_activities = [s["event"] for s in schedule if s.get("time") == slot_name] if schedule else []
        activity_str = ", ".join(current_activities) if current_activities else "등록된 일정 없음"
        context_question = f"현재 시간대({slot_name})의 활동은 '{activity_str}'입니다. 이 상황에 맞는 표현을 추천해주세요."

    elif recommend_type == "frequent":
        most_used = today_data.get("mostUsedToday", {})
        expr = most_used.get("expression", "")
        if expr:
            context_question = f"환자가 자주 사용하는 표현은 '{expr}'입니다. 비슷하거나 관련된 표현을 추천해주세요."
        else:
            context_question = "환자가 자주 사용하는 표현을 기반으로 추천해주세요."

    elif recommend_type == "recent":
        last_used = today_data.get("lastUsedFeature", {})
        expr = last_used.get("expression", "")
        if expr:
            context_question = f"환자가 최근에 사용한 표현은 '{expr}'입니다. 이어서 사용할 만한 표현을 추천해주세요."
        else:
            context_question = "환자의 최근 사용 맥락을 기반으로 추천해주세요."

    # guardianMessage가 있으면 컨텍스트에 추가
    if guardian_message:
        context_question += f" 보호자가 '{guardian_message}'라고 말했습니다."

    # 기존 추천 로직 재활용: context_question을 question으로 사용
    candidates = _search_sentences_mixed(context_question, user_db, sentiment_filter=None, intent_filter=None, k_total=6)
    sentences = _refine_recommend(context_question, candidates, sentiment_context=None)

    _recommend_stats["recommend_calls"] += 1
    _last_recommend_by_user[matching_id] = {"sentences": list(sentences), "at": datetime.now().isoformat()}

    return jsonify({"sentences": sentences})


@app.route("/recommend/replies", methods=["POST"])
def recommend_replies():
    """보호자 메시지 기반 추천 응답 생성"""
    data = request.json or {}
    matching_id = data.get("matching_id", 1)
    question = data.get("question", "").strip()
    history = data.get("history")

    if not question:
        return jsonify({"error": "메시지 내용이 필요합니다"}), 400

    user_data = _load_user_data_from_db(matching_id)
    if not user_data:
        return jsonify({"error": "matching not found"}), 404

    # 대화 이력이 있으면 컨텍스트에 추가
    context = question
    if history:
        history_text = " / ".join([f"{h.get('sender','')}: {h.get('content','')}" for h in history[-5:]])
        context = f"대화 이력: [{history_text}] / 보호자 질문: {question}"

    # 기존 추천 로직 재활용
    candidates = _search_sentences_mixed(context, user_data["user_db"], sentiment_filter=None, intent_filter=None, k_total=6)
    sentences = _refine_recommend(context, candidates, sentiment_context=None)

    # 각 문장에 intent 분류 + 메타정보 추가
    replies = []
    for rank, sentence in enumerate(sentences, start=1):
        sentiment, intent = _classify_sentence_keywords(sentence)
        replies.append({
            "id": f"reply-{rank}",
            "label": sentence,
            "intentKey": intent,
            "source": "context",
            "rank": rank,
        })

    _recommend_stats["recommend_calls"] += 1
    _last_recommend_by_user[matching_id] = {"sentences": list(sentences), "at": datetime.now().isoformat()}

    return jsonify({"replies": replies})


@app.route("/debug/recommend-stats", methods=["GET"])
def debug_recommend_stats():
    s = _recommend_stats
    total_recommended = s["recommend_calls"] * 3
    hit_rate = (s["expression_use_from_recommend"] / total_recommended * 100) if total_recommended else 0
    pick_rate = (s["expression_use_from_recommend"] / s["expression_use_total"] * 100) if s["expression_use_total"] else 0
    return jsonify({
        "counts": s,
        "rates": {"hit_rate_percent": round(hit_rate, 1), "pick_rate_percent": round(pick_rate, 1)},
    })


@app.route("/debug/timing", methods=["GET"])
def debug_timing():
    return jsonify(get_timing_summary())


@app.route("/debug/reset-timing", methods=["POST"])
def debug_reset_timing():
    reset_timing()
    return jsonify({"ok": True, "message": "timing data reset"})


@app.route("/debug/mlflow-log", methods=["POST"])
def debug_mlflow_log():
    run_name = request.json.get("run_name", "auto") if request.is_json else "auto"
    log_to_mlflow(_recommend_stats, run_name=run_name)
    return jsonify({"ok": True, "message": f"logged to mlflow as '{run_name}'"})


if __name__ == "__main__":
    precompute_embeddings()
    print("\n[DB 버전] 서버 시작: http://localhost:5003\n")
    app.run(host="0.0.0.0", debug=False, port=5003)
