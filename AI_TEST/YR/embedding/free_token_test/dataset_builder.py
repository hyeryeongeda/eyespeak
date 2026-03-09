"""
AI Hub 한국어 대화 요약 데이터셋에서 general_sentences.json 생성
Training + Validation 발화를 추출하여 일반 문장 DB로 변환
"""
import json
import os
from pathlib import Path

# 스크립트 위치 기준으로 경로 설정 (어디서 실행해도 동작)
BASE_DIR = Path(__file__).parent

# 파일명 → 카테고리명 매핑
FILE_CATEGORY = {
    "food_drink.json":         "식음료",
    "personal_relations.json": "개인및관계",
    "beauty_health.json":      "미용과건강",
    "commerce_shopping.json":  "상거래",
    "news_education.json":     "시사교육",
    "leisure.json":            "여가생활",
    "work_job.json":           "일과직업",
    "housing_life.json":       "주거와생활",
    "events.json":             "행사",
}

DATA_DIRS = [
    BASE_DIR / "data" / "Training",
    BASE_DIR / "data" / "Validation",
]

# 발화 길이 필터 (ALS 환자 답변용: 짧고 간결한 문장)
MAX_LEN = 30
MIN_LEN = 2

# 카테고리별 최대 문장 수 (총 ~2000개 목표)
MAX_PER_CATEGORY = 200


def extract_utterances(data_dirs: list) -> list:
    """모든 JSON 파일에서 발화 추출 (카테고리별 MAX_PER_CATEGORY 제한)"""
    # 카테고리별로 수집
    category_buckets: dict[str, list] = {cat: [] for cat in FILE_CATEGORY.values()}
    seen = set()

    for dir_path in data_dirs:
        for filename, category in FILE_CATEGORY.items():
            filepath = os.path.join(dir_path, filename)
            if not os.path.exists(filepath):
                print(f"  [스킵] {filepath}")
                continue

            # 이미 카테고리가 꽉 찼으면 스킵
            if len(category_buckets[category]) >= MAX_PER_CATEGORY:
                continue

            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)

            dialogues_data = data.get("data", [])
            count = 0

            for item in dialogues_data:
                if len(category_buckets[category]) >= MAX_PER_CATEGORY:
                    break

                utterances = item.get("body", {}).get("dialogue", [])
                for utt in utterances:
                    if len(category_buckets[category]) >= MAX_PER_CATEGORY:
                        break

                    text = utt.get("utterance", "").strip()

                    # 필터링
                    if not text:
                        continue
                    if len(text) < MIN_LEN or len(text) > MAX_LEN:
                        continue
                    if text in seen:
                        continue

                    seen.add(text)
                    category_buckets[category].append({"text": text, "category": category})
                    count += 1

            print(f"  {dir_path}/{filename}: {count}개 추출")

    # 카테고리 버킷 합치기
    sentences = []
    for cat_sentences in category_buckets.values():
        sentences.extend(cat_sentences)

    return sentences


def main():
    print("=" * 60)
    print("AI Hub 대화 데이터셋 → general_sentences.json 변환")
    print(f"발화 길이 필터: {MIN_LEN}~{MAX_LEN}자")
    print("=" * 60)

    sentences = extract_utterances(DATA_DIRS)

    print(f"\n총 추출 문장: {len(sentences)}개")

    # 카테고리별 통계
    from collections import Counter
    cat_count = Counter(s["category"] for s in sentences)
    print("\n카테고리별 분포:")
    for cat, cnt in cat_count.most_common():
        print(f"  {cat}: {cnt}개")

    # 저장
    output_path = BASE_DIR / "data" / "general_sentences.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sentences, f, ensure_ascii=False, indent=2)

    print(f"\n저장 완료: {output_path}")
    print(f"샘플 5개:")
    for s in sentences[:5]:
        print(f"  [{s['category']}] {s['text']}")


if __name__ == "__main__":
    main()
