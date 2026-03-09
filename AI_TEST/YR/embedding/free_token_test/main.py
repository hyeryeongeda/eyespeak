"""
메인 실행 파일
"""
import sys
import json
import os
from pathlib import Path

# Windows 터미널 한글 깨짐 방지
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
from embedding_service import get_embeddings_batch
from cross_encoder_service import CrossEncoderService
from vector_db import VectorDB
from recommendation import recommend_sentences

# 스크립트 위치 기준으로 경로 설정
BASE_DIR = Path(__file__).parent


def load_data():
    """데이터 로드"""
    with open(BASE_DIR / "data" / "user_sentences.json", encoding="utf-8") as f:
        user_data = json.load(f)

    with open(BASE_DIR / "data" / "general_sentences.json", encoding="utf-8") as f:
        general_data = json.load(f)

    return user_data, general_data


def build_vector_dbs(user_data, general_data):
    """벡터 DB 구축"""
    print("\n[1] 벡터 DB 구축 중...")

    # 환자 문장 DB
    user_sentences = [item["text"] for item in user_data]
    print(f"  - 환자 문장 임베딩 중: {len(user_sentences)}개")
    user_embeddings = get_embeddings_batch(user_sentences)

    user_db = VectorDB()
    user_db.add_sentences(user_sentences, user_embeddings)

    # 일반 문장 DB
    general_sentences = [item["text"] for item in general_data]
    print(f"  - 일반 문장 임베딩 중: {len(general_sentences)}개")
    general_embeddings = get_embeddings_batch(general_sentences)

    general_db = VectorDB()
    general_db.add_sentences(general_sentences, general_embeddings)

    print("  ✓ 벡터 DB 구축 완료\n")

    return user_db, general_db


def main():
    print("=" * 60)
    print("ALS 환자 의사소통 시스템 - 오른쪽 문장 추천")
    print("=" * 60)

    # 데이터 로드
    user_data, general_data = load_data()

    # 벡터 DB 구축
    user_db, general_db = build_vector_dbs(user_data, general_data)

    # Cross-encoder 로드
    print("[2] Cross-encoder 로드 중...")
    cross_encoder = CrossEncoderService()
    print("  ✓ 로드 완료\n")

    # 테스트 케이스
    test_cases = [
        "오늘 야구 경기 재밌었지?",
        "저녁 뭐 먹고 싶어?",
        "날씨 어때?",
        "몸은 좀 어때?",
    ]

    user_id = 1
    user_sentence_count = len([d for d in user_data if d["user_id"] == user_id])

    print(f"[3] 추천 테스트 (환자 ID: {user_id}, 문장 수: {user_sentence_count}개)")
    print("=" * 60)

    for i, test_stt in enumerate(test_cases, 1):
        print(f"\n테스트 {i}/{len(test_cases)}")
        print(f"보호자: \"{test_stt}\"")
        print("-" * 60)

        result = recommend_sentences(
            test_stt,
            user_id,
            user_db,
            general_db,
            cross_encoder,
            user_sentence_count,
        )

        print("\n추천 답변:")
        for j, answer in enumerate(result["answers"], 1):
            print(f"  {j}. {answer}")

        print(f"\n처리 시간:")
        for step, duration in result["timing"].items():
            print(f"  - {step}: {duration:.3f}초")
        print(f"  - 총 소요: {sum(result['timing'].values()):.3f}초")

        if i < len(test_cases):
            print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
