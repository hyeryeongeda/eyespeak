"""
전체 추천 로직 통합
"""
import time
from embedding_service import get_embedding
from cross_encoder_service import CrossEncoderService
from vector_db import VectorDB
from llm_service import refine_with_llm


def recommend_sentences(
    caregiver_stt: str,
    user_id: int,
    user_db: VectorDB,
    general_db: VectorDB,
    cross_encoder: CrossEncoderService,
    user_sentence_count: int,
) -> dict:
    """
    메인 추천 함수

    Returns:
        {
            "answers": [...],
            "timing": {...},
            "debug_info": {...}
        }
    """
    timing = {}

    # 1. Bi-encoder 임베딩
    start = time.time()
    query_embedding = get_embedding(caregiver_stt)
    timing["embedding"] = time.time() - start

    # 2. Cold Start 체크 및 검색 비율 결정
    if user_sentence_count < 10:
        user_k, general_k = 0, 20
    elif user_sentence_count < 30:
        user_k, general_k = 6, 14
    else:
        user_k, general_k = 15, 5

    # 3. 벡터 DB 검색
    start = time.time()

    candidates = []  # {"text": str, "score": float, "source": str}

    if user_k > 0 and user_db.index.ntotal > 0:
        distances, indices = user_db.search(query_embedding, top_k=user_k)
        user_results = user_db.get_sentences_by_indices(indices.tolist())
        for text, score in zip(user_results, distances.tolist()):
            candidates.append({"text": text, "score": score, "source": "user"})

    if general_k > 0 and general_db.index.ntotal > 0:
        distances, indices = general_db.search(query_embedding, top_k=general_k)
        general_results = general_db.get_sentences_by_indices(indices.tolist())
        for text, score in zip(general_results, distances.tolist()):
            candidates.append({"text": text, "score": score, "source": "general"})

    timing["search"] = time.time() - start

    # 4. Cross-encoder 재랭킹
    start = time.time()
    candidate_texts = [c["text"] for c in candidates]
    if candidate_texts:
        rerank_scores = cross_encoder.rerank(caregiver_stt, candidate_texts)
        for i, score in enumerate(rerank_scores):
            candidates[i]["rerank_score"] = score
        # 재랭킹 점수 기준 내림차순 정렬
        candidates.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
    timing["rerank"] = time.time() - start

    # 5. 상위 5개 선별
    top_5 = [c["text"] for c in candidates[:5]]

    # 6. LLM 재구성
    start = time.time()
    final_answers = refine_with_llm(caregiver_stt, top_5)
    timing["llm"] = time.time() - start

    return {
        "answers": final_answers,
        "timing": timing,
        "debug_info": {
            "user_sentence_count": user_sentence_count,
            "search_ratio": f"user:{user_k}, general:{general_k}",
            "candidates_count": len(candidates),
            "top_5": top_5,
        },
    }
