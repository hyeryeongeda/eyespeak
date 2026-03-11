"""
caregiver_server.py - 보호자와의 대화 프로토타입 서버
기존 stt_server.py 기능 유지 + 카테고리 기반 개선 기능 추가
  - user_sentences2.json (pastExpressions, todayData 구조)
  - 로컬 임베딩 (paraphrase-multilingual-MiniLM-L12-v2)
  - GMS LLM (gpt-4o-mini) 후처리 + 카테고리 생성
포트: 5003
"""
import json
import math
import os
import random
import numpy as np
from pathlib import Path
from flask import Flask, jsonify, request, send_file
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR  = BASE_DIR / "data"

load_dotenv()

app = Flask(__name__)

# ====== GMS LLM 설정 ======
GMS_KEY = os.getenv("GMS_KEY", "")
llm_client = OpenAI(
    api_key=GMS_KEY,
    base_url="https://gms.ssafy.io/gmsapi/api.openai.com/v1"
)

# ====== 로컬 임베딩 모델 ======
print("[초기화] 임베딩 모델 로딩 중...")
embed_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
print("[초기화] 임베딩 모델 로딩 완료")


# ====== 데이터 로드 ======
def _load_databases():
    data_file = DATA_DIR / "user" / "als_patient_dataset.json"
    data_path_abs = data_file.resolve()
    print(f"[데이터 로드] 읽는 파일 경로: {data_path_abs}")

    with open(data_file, "r", encoding="utf-8") as f:
        user_raw = json.load(f)

    today_data  = user_raw["todayData"]
    expressions = user_raw["pastExpressions"]

    user_db = [
        {
            "text":       item["text"],
            "source":     "user",
            "sentiment":  item.get("sentiment", "중립"),
            "categories": item.get("categories", []),
            "keywords":   item.get("keywords", []),
            "weight":     1.0 + math.log(item.get("usageCount", 1) + 1),
        }
        for item in expressions
    ]

    # 단어 목록: als_patient_dataset.json의 pastWords에서만 로드 (형식: { subjects, objects, verbs, punctuation })
    past_words = user_raw.get("pastWords")
    default_word_lists = {
        "subjects": ["나", "우리", "손녀딸", "딸", "엄마", "아빠"],
        "objects": ["물", "음식", "약"],
        "verbs": ["먹다", "마시다", "보다", "좋아하다"],
        "punctuation": [".", ",", "!", "?", "~", "없음"]
    }
    if isinstance(past_words, dict) and past_words.get("subjects") is not None:
        word_lists = {k: list(v) if isinstance(v, list) else v for k, v in past_words.items()}
        if "punctuation" not in word_lists or not word_lists["punctuation"]:
            word_lists["punctuation"] = default_word_lists["punctuation"]
        print(f"[데이터 로드] 단어 목록: pastWords 사용 (subjects {len(word_lists.get('subjects', []))}개)")
    else:
        word_lists = default_word_lists
        print("[데이터 로드] 단어 목록: pastWords 없음/형식 오류 → 내장 기본값 사용")

    subjects_loaded = word_lists.get("subjects", [])
    print(f"[데이터 로드] 주어 목록(실제 로드됨): {subjects_loaded}")

    return today_data, user_db, word_lists


today_data, user_db, word_lists = _load_databases()

# ====== 임베딩 캐시 ======
embedding_cache: dict = {}


def get_embedding(text: str) -> np.ndarray:
    if text not in embedding_cache:
        embedding_cache[text] = embed_model.encode(text, convert_to_numpy=True)
    return embedding_cache[text]


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def precompute_embeddings():
    all_texts = (
        [item["text"] for item in user_db]
        + word_lists.get("subjects", [])
        + word_lists.get("objects", [])
        + word_lists.get("verbs", [])
    )
    print(f"[초기화] 임베딩 사전 계산 중... ({len(all_texts)}개)")
    for text in all_texts:
        get_embedding(text)
    print("[초기화] 완료")


# ====== 검색 ======
def _search_sentences(question: str, sentiment_filter: str | None = None, k: int = 5) -> list:
    """user_db에서 가중치 유사도 검색. sentiment_filter가 있으면 1차 필터링."""
    pool = user_db
    if sentiment_filter:
        filtered = [item for item in user_db if item["sentiment"] == sentiment_filter]
        if len(filtered) >= k:
            pool = filtered
        # 필터 후 부족하면 전체 사용

    q_vec = get_embedding(question)
    results = []
    for item in pool:
        sim = cosine_sim(q_vec, get_embedding(item["text"]))
        results.append({
            "text":   item["text"],
            "score":  sim * item["weight"],
            "source": item["source"],
        })

    seen, deduped = set(), []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        if r["text"] not in seen:
            seen.add(r["text"])
            deduped.append(r)
    return deduped[:k]


def _search_words(question: str, category: str, k: int = 4, offset: int = 0) -> list:
    """단어 목록에서 유사도 순 상위 k개 (offset: 새로고침용)"""
    if category == "punctuation":
        return word_lists["punctuation"]
    q_vec     = get_embedding(question)
    word_list = word_lists.get(category, [])
    scored    = sorted(word_list, key=lambda w: cosine_sim(q_vec, get_embedding(w)), reverse=True)
    if offset:
        rest = scored[offset:] or scored
        random.shuffle(rest)
        return rest[:k]
    return scored[:k]


# ====== LLM 후처리 ======
def _refine_recommend(question: str, candidates: list) -> list:
    """검색 결과를 LLM으로 정제 → 추천 문장 3개"""
    texts  = [c["text"] for c in candidates]
    prompt = f"""보호자 질문: "{question}"
환자가 과거에 자주 쓴 표현:
{chr(10).join(f"- {t}" for t in texts)}

위 표현들을 참고해서 질문에 어울리는 자연스러운 환자 답변을 정확히 3개 만드세요.
- 보호자 질문 시제/맥락에 맞게 (과거 질문→과거형, 현재→현재형)
- 반말 구어체, 15자 이내
- 긍정 1개, 부정/중립 2개로 다양하게
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
    punct_set     = {".", ",", "!", "?", "~"}
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


def _generate_categories(question: str) -> dict:
    """
    보호자 질문 → 카테고리 + sentiment 매핑 생성
    반환: {"categories": [...], "sentimentMap": {...}}
    """
    prompt = f"""보호자 질문: "{question}"

이 질문에 대한 환자 답변의 주요 방향성을 카테고리로 분류하세요.

질문 유형별 규칙:
1. 예/아니오 질문 → 2개: [예, 아니오]
2. 간단한 평가 → 3개: [좋아, 싫어, 그저그래]
3. 세밀한 평가 → 4개: [아주 좋아, 좋아, 별로, 나쁨]
4. 기분 질문 → 3-4개: [행복, 슬픔, 그저그래] 또는 [행복, 슬픔, 화남, 그저그래]
5. 통증 질문 → 3-4개: [아파, 안 아파, 조금 아파] 또는 추가
6. 음식 선택 → 2-3개: [예, 아니오] 또는 [먹고 싶어, 안 먹고 싶어, 다른 거]

카테고리는 2-4개 사이로, 질문에 가장 적합한 개수로 만드세요.

각 카테고리의 sentiment도 지정하세요:
- "긍정": 좋아, 예, 행복, 아주 좋아, 먹고 싶어 등
- "부정": 싫어, 아니오, 슬픔, 화남, 나쁨, 아파, 안 먹고 싶어 등
- "중립": 그저그래, 모르겠어, 조금, 다른 거 등

반드시 이 JSON 형식만 출력:
{{
  "categories": ["카테고리1", "카테고리2", ...],
  "sentimentMap": {{
    "카테고리1": "긍정",
    "카테고리2": "부정"
  }}
}}

예시1 - "저녁 먹을래?":
{{"categories":["예","아니오"],"sentimentMap":{{"예":"긍정","아니오":"부정"}}}}

예시2 - "이대호 선수 어때?":
{{"categories":["좋아","싫어","그저그래"],"sentimentMap":{{"좋아":"긍정","싫어":"부정","그저그래":"중립"}}}}"""

    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "JSON만 출력하세요. 다른 텍스트 없이."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=150, temperature=0.3,
        )
        raw    = resp.choices[0].message.content.strip().replace("```json","").replace("```","").strip()
        result = json.loads(raw)
        if "categories" not in result or "sentimentMap" not in result:
            raise ValueError("Invalid format")
        return result
    except Exception as e:
        print(f"[카테고리 생성 실패] {e}")
        return {
            "categories": ["좋아", "싫어", "그저그래"],
            "sentimentMap": {"좋아": "긍정", "싫어": "부정", "그저그래": "중립"}
        }


# ====== API 엔드포인트 ======

@app.route("/")
def index():
    return send_file(BASE_DIR / "caregiver_prototype.html")


@app.route("/debug/word_sources", methods=["GET"], strict_slashes=False)
def debug_word_sources():
    """이 프로세스가 실제로 쓰는 데이터 출처 확인용. Postman: GET http://localhost:5003/debug/word_sources"""
    data_path = (DATA_DIR / "user" / "als_patient_dataset.json").resolve()
    return jsonify({
        "data_path": str(data_path),
        "data_path_exists": data_path.exists(),
        "subjects": word_lists.get("subjects", []),
        "subjects_count": len(word_lists.get("subjects", [])),
    })


@app.route("/debug", methods=["GET"], strict_slashes=False)
def debug_index():
    """caregiver 서버 여부 확인. 이게 보이면 5003 포트가 맞음."""
    return jsonify({"server": "caregiver", "port": 5003, "word_sources": "GET /debug/word_sources"})


@app.route("/today", methods=["GET"])
def get_today():
    """환자 먼저 시작 모드용: todayData 반환"""
    return jsonify(today_data)


@app.route("/recommend", methods=["POST"])
def recommend():
    """질문 + 선택적 감정 필터 → user_db 검색 → LLM 정제 → 추천 문장 3개"""
    data             = request.json
    question         = data.get("question", "").strip()
    sentiment_filter = data.get("sentiment", None)   # 신규: 카테고리 선택 시 전달
    if not question:
        return jsonify({"error": "질문을 입력하세요"}), 400

    candidates = _search_sentences(question, sentiment_filter, k=5)
    sentences  = _refine_recommend(question, candidates)
    return jsonify({"sentences": sentences})


@app.route("/categories", methods=["POST"])
def categories():
    """보호자 질문 → LLM 카테고리 + sentiment 매핑 생성"""
    question = request.json.get("question", "").strip()
    if not question:
        return jsonify({"error": "질문을 입력하세요"}), 400
    result = _generate_categories(question)
    return jsonify({
        "categories":   result["categories"],
        "sentimentMap": result["sentimentMap"]
    })


@app.route("/words", methods=["POST"])
def get_words():
    """카테고리별 유사 단어 4개"""
    data     = request.json
    question = data.get("question", "").strip()
    category = data.get("category", "")
    if not question or category not in word_lists:
        return jsonify({"error": "잘못된 요청"}), 400
    words = _search_words(question, category, k=4)
    return jsonify({"words": words})


@app.route("/words_all", methods=["POST"])
def get_words_all():
    """새로고침: 다른 단어 4개"""
    data     = request.json
    question = data.get("question", "").strip()
    category = data.get("category", "")
    if not question or category not in word_lists:
        return jsonify({"error": "잘못된 요청"}), 400
    if category == "punctuation":
        shuffled = word_lists["punctuation"][:]
        random.shuffle(shuffled)
        return jsonify({"words": shuffled[:6]})
    words = _search_words(question, category, k=4, offset=4)
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
