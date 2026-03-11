"""
stt_server.py - STT 추천 최종 모델
이중 DB (일반 말뭉치 + 유저 개인화 데이터) 임베딩 유사도 검색
유저 데이터 usage_count 가중치 → LLM(GMS gpt-4o-mini) 후처리
"""
import json
import math
import os
import random
import numpy as np
from pathlib import Path
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

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
    # 일반 말뭉치
    with open(DATA_DIR / "general_sentences.json", "r", encoding="utf-8") as f:
        general_raw = json.load(f)
    general_db = [
        {"text": item["text"], "source": "general", "weight": 1.0}
        for item in general_raw
    ]

    # 유저 개인화 데이터 (usage_count → log 가중치)
    with open(DATA_DIR / "user" / "user_sentences.json", "r", encoding="utf-8") as f:
        user_raw = json.load(f)
    user_db = [
        {
            "text": item["text"],
            "source": "user",
            "weight": 1.0 + math.log(item.get("usage_count", 1) + 1),
        }
        for item in user_raw
    ]

    # 단어 목록
    with open(DATA_DIR / "word_lists.json", "r", encoding="utf-8") as f:
        word_lists = json.load(f)

    return general_db, user_db, word_lists


general_db, user_db, word_lists = _load_databases()

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
        [item["text"] for item in general_db]
        + [item["text"] for item in user_db]
        + word_lists["subjects"]
        + word_lists["objects"]
        + word_lists["verbs"]
    )
    print(f"[초기화] 임베딩 사전 계산 중... ({len(all_texts)}개)")
    for text in all_texts:
        get_embedding(text)
    print("[초기화] 완료")


# ====== 검색 ======
def _search_sentences(question: str, k: int = 5) -> list:
    """일반 말뭉치 + 유저 DB에서 가중치 유사도 검색, 중복 제거 후 상위 k개"""
    q_vec = get_embedding(question)
    results = []
    for item in general_db + user_db:
        sim = cosine_sim(q_vec, get_embedding(item["text"]))
        results.append({
            "text": item["text"],
            "score": sim * item["weight"],
            "source": item["source"],
        })

    seen = set()
    deduped = []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        if r["text"] not in seen:
            seen.add(r["text"])
            deduped.append(r)
    return deduped[:k]


def _search_words(question: str, category: str, k: int = 4, offset: int = 0) -> list:
    """단어 목록에서 유사도 순 상위 k개 (offset: 새로고침용)"""
    if category == "punctuation":
        return word_lists["punctuation"]
    q_vec = get_embedding(question)
    word_list = word_lists.get(category, [])
    scored = sorted(word_list, key=lambda w: cosine_sim(q_vec, get_embedding(w)), reverse=True)
    if offset:
        rest = scored[offset:] or scored
        random.shuffle(rest)
        return rest[:k]
    return scored[:k]


# ====== LLM 후처리 ======
def _refine_recommend(question: str, candidates: list) -> list:
    """검색 결과를 LLM으로 정제 → 추천 문장 3개"""
    candidate_texts = [c["text"] for c in candidates]
    prompt = f"""보호자 질문: "{question}"
환자가 과거에 자주 쓴 표현:
{chr(10).join(f"- {t}" for t in candidate_texts)}

위 표현들을 참고해서 질문에 어울리는 자연스러운 환자 답변을 정확히 3개 만드세요.
- 보호자 질문 시제/맥락에 맞게 (과거 질문→과거형, 현재→현재형)
- 반말 구어체, 15자 이내
- 긍정 1개, 부정/중립 2개로 다양하게
- 번호나 기호 없이 줄바꿈으로만 구분하여 3개 출력"""
    try:
        response = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "ALS 환자 답변 생성 전문가. 요청한 개수만큼만 출력."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=100,
            temperature=0.7,
        )
        sentences = [
            s.strip()
            for s in response.choices[0].message.content.strip().split("\n")
            if s.strip()
        ][:3]
    except Exception:
        sentences = []

    # LLM 실패 or 부족 시 검색 결과로 채움
    fallback = [c["text"] for c in candidates]
    while len(sentences) < 3:
        sentences.append(fallback[len(sentences) % len(fallback)] if fallback else "응")
    return sentences


def _generate_from_words(words: list, question: str) -> list:
    """선택된 단어들로 문장 3개 생성"""
    punct = ""
    content_words = []
    for w in words:
        if w in (".", ",", "!", "?", "~"):
            punct = w
        elif w != "없음":
            content_words.append(w)

    prompt = f"""보호자 질문: "{question}"
선택된 단어: {', '.join(content_words)}
문장 끝 부호: {punct if punct else '없음'}

위 단어들로 환자가 답할 법한 자연스러운 한국어 문장을 정확히 3개 만드세요.
- 보호자 질문 시제에 맞게 (과거형/현재형)
- 반말 구어체, 15자 이내
- 지정된 문장 부호로 끝내기
- 번호나 기호 없이 줄바꿈으로만 구분하여 3개 출력"""
    try:
        response = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "ALS 환자 답변 생성 전문가. 요청한 개수만큼만 출력."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=120,
            temperature=0.8,
        )
        sentences = [
            s.strip()
            for s in response.choices[0].message.content.strip().split("\n")
            if s.strip()
        ][:3]
    except Exception:
        sentences = []

    # 폴백: 단어 직접 조합
    verb_map = {
        "응원하다": "응원했어", "보다": "봤어", "좋아하다": "좋아했어",
        "싫어하다": "싫었어", "먹다": "먹었어", "마시다": "마셨어",
        "듣다": "들었어", "생각하다": "생각했어", "즐기다": "즐거웠어",
        "기억하다": "기억해", "쉬다": "쉬었어", "힘들다": "힘들었어",
    }
    fallback = " ".join(verb_map.get(w, w) for w in content_words if w) + punct
    while len(sentences) < 3:
        sentences.append(fallback or "응")
    return sentences


# ====== API 엔드포인트 ======

@app.route("/recommend", methods=["POST"])
def recommend():
    """보호자 질문 → 이중 DB 검색 → LLM 정제 → 추천 문장 3개"""
    question = request.json.get("question", "").strip()
    if not question:
        return jsonify({"error": "질문을 입력하세요"}), 400
    candidates = _search_sentences(question, k=5)
    sentences = _refine_recommend(question, candidates)
    return jsonify({"sentences": sentences})


@app.route("/words", methods=["POST"])
def get_words():
    """카테고리별 유사 단어 4개"""
    data = request.json
    question = data.get("question", "").strip()
    category = data.get("category", "")
    if not question or category not in word_lists:
        return jsonify({"error": "잘못된 요청"}), 400
    words = _search_words(question, category, k=4)
    return jsonify({"words": words})


@app.route("/words_all", methods=["POST"])
def get_words_all():
    """새로고침: 다른 단어 4개"""
    data = request.json
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
    """선택된 단어 → LLM 문장 3개 생성 → JSON 반환"""
    words = request.json.get("words", [])
    question = request.json.get("question", "")
    if not words:
        return jsonify({"error": "단어를 선택하세요"}), 400
    sentences = _generate_from_words(words, question)
    return jsonify({"sentences": sentences})


@app.route("/")
def index():
    return send_file(BASE_DIR / "stt_server.html")


if __name__ == "__main__":
    precompute_embeddings()
    print("\n서버 시작: http://localhost:5002\n")
    app.run(debug=False, port=5002)
