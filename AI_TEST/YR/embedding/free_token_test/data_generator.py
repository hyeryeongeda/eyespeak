"""
샘플 데이터 생성 스크립트
"""
import json
import os
from pathlib import Path

# 스크립트 위치 기준으로 경로 설정
BASE_DIR = Path(__file__).parent

# data 디렉토리 생성
(BASE_DIR / "data").mkdir(exist_ok=True)

# 환자 과거 문장 (50개)
user_sentences = [
    # 야구 관련
    {"user_id": 1, "text": "나 이정호 응원했어", "usage_count": 15, "created_at": "2024-03-01"},
    {"user_id": 1, "text": "야구 경기 좋았어", "usage_count": 12, "created_at": "2024-03-02"},
    {"user_id": 1, "text": "9회 역전 짜릿했어", "usage_count": 8, "created_at": "2024-03-03"},
    {"user_id": 1, "text": "홈런 쳤을 때 좋았어", "usage_count": 7, "created_at": "2024-03-04"},
    {"user_id": 1, "text": "심판 판정 별로였어", "usage_count": 5, "created_at": "2024-03-05"},
    {"user_id": 1, "text": "오늘 경기 기대돼", "usage_count": 9, "created_at": "2024-03-06"},
    {"user_id": 1, "text": "우리 팀 이겼으면 해", "usage_count": 11, "created_at": "2024-03-07"},

    # 음식 관련
    {"user_id": 1, "text": "김치찌개 먹고 싶어", "usage_count": 20, "created_at": "2024-03-08"},
    {"user_id": 1, "text": "된장찌개 어때", "usage_count": 15, "created_at": "2024-03-09"},
    {"user_id": 1, "text": "국수 괜찮아", "usage_count": 10, "created_at": "2024-03-10"},
    {"user_id": 1, "text": "고기 먹고 싶네", "usage_count": 18, "created_at": "2024-03-11"},
    {"user_id": 1, "text": "아무거나 좋아", "usage_count": 25, "created_at": "2024-03-12"},
    {"user_id": 1, "text": "밥이 맛있었어", "usage_count": 13, "created_at": "2024-03-13"},
    {"user_id": 1, "text": "배 안 고파", "usage_count": 8, "created_at": "2024-03-14"},
    {"user_id": 1, "text": "조금만 먹을게", "usage_count": 6, "created_at": "2024-03-15"},

    # 일상 대화
    {"user_id": 1, "text": "응, 좋아", "usage_count": 30, "created_at": "2024-03-16"},
    {"user_id": 1, "text": "나도 그렇게 생각해", "usage_count": 12, "created_at": "2024-03-17"},
    {"user_id": 1, "text": "진짜 그래", "usage_count": 22, "created_at": "2024-03-18"},
    {"user_id": 1, "text": "고마워", "usage_count": 35, "created_at": "2024-03-19"},
    {"user_id": 1, "text": "괜찮아", "usage_count": 28, "created_at": "2024-03-20"},
    {"user_id": 1, "text": "알겠어", "usage_count": 20, "created_at": "2024-03-21"},
    {"user_id": 1, "text": "좀 있다 해", "usage_count": 7, "created_at": "2024-03-22"},

    # 건강/상태
    {"user_id": 1, "text": "좀 아파", "usage_count": 10, "created_at": "2024-03-23"},
    {"user_id": 1, "text": "허리 아파", "usage_count": 15, "created_at": "2024-03-24"},
    {"user_id": 1, "text": "피곤해", "usage_count": 12, "created_at": "2024-03-25"},
    {"user_id": 1, "text": "괜찮아 걱정 마", "usage_count": 8, "created_at": "2024-03-26"},
    {"user_id": 1, "text": "많이 나아졌어", "usage_count": 6, "created_at": "2024-03-27"},
    {"user_id": 1, "text": "좀 쉬고 싶어", "usage_count": 9, "created_at": "2024-03-28"},
    {"user_id": 1, "text": "약 먹었어", "usage_count": 11, "created_at": "2024-03-29"},

    # 날씨/환경
    {"user_id": 1, "text": "오늘 날씨 좋다", "usage_count": 8, "created_at": "2024-03-30"},
    {"user_id": 1, "text": "창문 열어줘", "usage_count": 6, "created_at": "2024-04-01"},
    {"user_id": 1, "text": "좀 추워", "usage_count": 7, "created_at": "2024-04-02"},
    {"user_id": 1, "text": "더워", "usage_count": 9, "created_at": "2024-04-03"},

    # TV/영화
    {"user_id": 1, "text": "TV 틀어줘", "usage_count": 14, "created_at": "2024-04-04"},
    {"user_id": 1, "text": "드라마 재밌어", "usage_count": 10, "created_at": "2024-04-05"},
    {"user_id": 1, "text": "뉴스 보고 싶어", "usage_count": 8, "created_at": "2024-04-06"},

    # 가족
    {"user_id": 1, "text": "아들 보고 싶어", "usage_count": 5, "created_at": "2024-04-07"},
    {"user_id": 1, "text": "딸 언제 와", "usage_count": 4, "created_at": "2024-04-08"},
    {"user_id": 1, "text": "전화해줘", "usage_count": 10, "created_at": "2024-04-09"},

    # 취침/휴식
    {"user_id": 1, "text": "졸려", "usage_count": 12, "created_at": "2024-04-10"},
    {"user_id": 1, "text": "자고 싶어", "usage_count": 9, "created_at": "2024-04-11"},
    {"user_id": 1, "text": "불 꺼줘", "usage_count": 8, "created_at": "2024-04-12"},

    # 기타 요청
    {"user_id": 1, "text": "물 줘", "usage_count": 22, "created_at": "2024-04-13"},
    {"user_id": 1, "text": "손 잡아줘", "usage_count": 7, "created_at": "2024-04-14"},
    {"user_id": 1, "text": "조금만 기다려", "usage_count": 6, "created_at": "2024-04-15"},
    {"user_id": 1, "text": "도와줘", "usage_count": 14, "created_at": "2024-04-16"},
    {"user_id": 1, "text": "일어나고 싶어", "usage_count": 5, "created_at": "2024-04-17"},
    {"user_id": 1, "text": "자세 바꿔줘", "usage_count": 11, "created_at": "2024-04-18"},
    {"user_id": 1, "text": "음악 틀어줘", "usage_count": 7, "created_at": "2024-04-19"},
    {"user_id": 1, "text": "창문 닫아줘", "usage_count": 5, "created_at": "2024-04-20"},
]

# 일반 대화 문장 (200개)
general_sentences = [
    # 동의/긍정 (40개)
    {"text": "응, 재밌었어", "category": "agreement"},
    {"text": "맞아", "category": "agreement"},
    {"text": "그렇지", "category": "agreement"},
    {"text": "나도 그래", "category": "agreement"},
    {"text": "정말 그래", "category": "agreement"},
    {"text": "좋아", "category": "agreement"},
    {"text": "응응", "category": "agreement"},
    {"text": "당연하지", "category": "agreement"},
    {"text": "맞는 말이야", "category": "agreement"},
    {"text": "그러게", "category": "agreement"},
    {"text": "그러면 좋겠어", "category": "agreement"},
    {"text": "그게 나아", "category": "agreement"},
    {"text": "괜찮을 것 같아", "category": "agreement"},
    {"text": "잘 됐다", "category": "agreement"},
    {"text": "다행이야", "category": "agreement"},
    {"text": "좋은 생각이야", "category": "agreement"},
    {"text": "해봐", "category": "agreement"},
    {"text": "해", "category": "agreement"},
    {"text": "그래 그래", "category": "agreement"},
    {"text": "알겠어", "category": "agreement"},
    {"text": "어, 맞아", "category": "agreement"},
    {"text": "진짜로", "category": "agreement"},
    {"text": "사실 그래", "category": "agreement"},
    {"text": "완전 동의", "category": "agreement"},
    {"text": "그거 좋다", "category": "agreement"},
    {"text": "나도 좋아", "category": "agreement"},
    {"text": "기대돼", "category": "agreement"},
    {"text": "재밌겠다", "category": "agreement"},
    {"text": "해보자", "category": "agreement"},
    {"text": "좋지", "category": "agreement"},
    {"text": "보고 싶었어", "category": "agreement"},
    {"text": "정말 재밌어", "category": "agreement"},
    {"text": "응, 그래", "category": "agreement"},
    {"text": "맞아 맞아", "category": "agreement"},
    {"text": "당연히 좋지", "category": "agreement"},
    {"text": "나쁘지 않아", "category": "agreement"},
    {"text": "기분 좋아", "category": "agreement"},
    {"text": "행복해", "category": "agreement"},
    {"text": "좋은데", "category": "agreement"},
    {"text": "그거 해줘", "category": "agreement"},

    # 부정/거절 (25개)
    {"text": "아니야", "category": "disagreement"},
    {"text": "별로야", "category": "disagreement"},
    {"text": "안 좋아", "category": "disagreement"},
    {"text": "싫어", "category": "disagreement"},
    {"text": "안 해", "category": "disagreement"},
    {"text": "필요 없어", "category": "disagreement"},
    {"text": "됐어", "category": "disagreement"},
    {"text": "그냥 둬", "category": "disagreement"},
    {"text": "아직 아니야", "category": "disagreement"},
    {"text": "안 먹을게", "category": "disagreement"},
    {"text": "안 가도 돼", "category": "disagreement"},
    {"text": "지금은 아니야", "category": "disagreement"},
    {"text": "그건 별로야", "category": "disagreement"},
    {"text": "안 괜찮아", "category": "disagreement"},
    {"text": "그건 싫어", "category": "disagreement"},
    {"text": "하기 싫어", "category": "disagreement"},
    {"text": "그냥 아니야", "category": "disagreement"},
    {"text": "아직 괜찮아", "category": "disagreement"},
    {"text": "잠깐 기다려", "category": "disagreement"},
    {"text": "나중에 해", "category": "disagreement"},
    {"text": "됐어요", "category": "disagreement"},
    {"text": "안 해도 돼", "category": "disagreement"},
    {"text": "아니 괜찮아", "category": "disagreement"},
    {"text": "그건 모르겠어", "category": "disagreement"},
    {"text": "별로 안 좋아", "category": "disagreement"},

    # 감사/사과 (20개)
    {"text": "고마워", "category": "gratitude"},
    {"text": "정말 고마워", "category": "gratitude"},
    {"text": "많이 도움됐어", "category": "gratitude"},
    {"text": "잘 해줬어", "category": "gratitude"},
    {"text": "수고했어", "category": "gratitude"},
    {"text": "네 덕분이야", "category": "gratitude"},
    {"text": "미안해", "category": "apology"},
    {"text": "미안해 정말", "category": "apology"},
    {"text": "내가 잘못했어", "category": "apology"},
    {"text": "다음엔 잘 할게", "category": "apology"},
    {"text": "괜찮아", "category": "reassurance"},
    {"text": "걱정 마", "category": "reassurance"},
    {"text": "별거 아니야", "category": "reassurance"},
    {"text": "그럴 수 있어", "category": "reassurance"},
    {"text": "다음에 잘 하면 돼", "category": "reassurance"},
    {"text": "이해해", "category": "reassurance"},
    {"text": "신경 쓰지 마", "category": "reassurance"},
    {"text": "그래도 돼", "category": "reassurance"},
    {"text": "감사해요", "category": "gratitude"},
    {"text": "고생했어", "category": "gratitude"},

    # 요청 (30개)
    {"text": "물 좀 줘", "category": "request"},
    {"text": "도와줘", "category": "request"},
    {"text": "불 켜줘", "category": "request"},
    {"text": "불 꺼줘", "category": "request"},
    {"text": "창문 열어줘", "category": "request"},
    {"text": "창문 닫아줘", "category": "request"},
    {"text": "전화해줘", "category": "request"},
    {"text": "불러줘", "category": "request"},
    {"text": "손 잡아줘", "category": "request"},
    {"text": "자세 바꿔줘", "category": "request"},
    {"text": "TV 켜줘", "category": "request"},
    {"text": "TV 꺼줘", "category": "request"},
    {"text": "음악 틀어줘", "category": "request"},
    {"text": "음악 꺼줘", "category": "request"},
    {"text": "약 줘", "category": "request"},
    {"text": "침대 올려줘", "category": "request"},
    {"text": "이불 덮어줘", "category": "request"},
    {"text": "조금 더 줘", "category": "request"},
    {"text": "잠깐 기다려", "category": "request"},
    {"text": "천천히 해줘", "category": "request"},
    {"text": "다시 해줘", "category": "request"},
    {"text": "읽어줘", "category": "request"},
    {"text": "보여줘", "category": "request"},
    {"text": "가져다줘", "category": "request"},
    {"text": "치워줘", "category": "request"},
    {"text": "더 세게 해줘", "category": "request"},
    {"text": "살살 해줘", "category": "request"},
    {"text": "잠깐만", "category": "request"},
    {"text": "좀 있다가", "category": "request"},
    {"text": "지금 해줘", "category": "request"},

    # 날씨/환경 (15개)
    {"text": "날씨 좋아", "category": "weather"},
    {"text": "비 와", "category": "weather"},
    {"text": "춥다", "category": "weather"},
    {"text": "덥다", "category": "weather"},
    {"text": "맑아", "category": "weather"},
    {"text": "흐려", "category": "weather"},
    {"text": "눈 온다", "category": "weather"},
    {"text": "바람 불어", "category": "weather"},
    {"text": "좀 서늘해", "category": "weather"},
    {"text": "기분 좋은 날씨야", "category": "weather"},
    {"text": "오늘 날씨 어때", "category": "weather"},
    {"text": "창문 닫아", "category": "weather"},
    {"text": "따뜻해", "category": "weather"},
    {"text": "습해", "category": "weather"},
    {"text": "쾌청해", "category": "weather"},

    # 건강/상태 (25개)
    {"text": "좀 아파", "category": "health"},
    {"text": "많이 아파", "category": "health"},
    {"text": "머리 아파", "category": "health"},
    {"text": "배 아파", "category": "health"},
    {"text": "피곤해", "category": "health"},
    {"text": "졸려", "category": "health"},
    {"text": "힘들어", "category": "health"},
    {"text": "좋아졌어", "category": "health"},
    {"text": "괜찮아진 것 같아", "category": "health"},
    {"text": "아직 아파", "category": "health"},
    {"text": "조금 나아졌어", "category": "health"},
    {"text": "숨 쉬기 힘들어", "category": "health"},
    {"text": "목 아파", "category": "health"},
    {"text": "다리 저려", "category": "health"},
    {"text": "어지러워", "category": "health"},
    {"text": "약 먹었어", "category": "health"},
    {"text": "컨디션 별로야", "category": "health"},
    {"text": "오늘은 좀 나아", "category": "health"},
    {"text": "잘 잤어", "category": "health"},
    {"text": "잠을 못 잤어", "category": "health"},
    {"text": "입맛 없어", "category": "health"},
    {"text": "배고파", "category": "health"},
    {"text": "배 불러", "category": "health"},
    {"text": "좀 쉬어야겠어", "category": "health"},
    {"text": "그냥 좀 누워있을게", "category": "health"},

    # 음식 (20개)
    {"text": "맛있어", "category": "food"},
    {"text": "맛없어", "category": "food"},
    {"text": "짜", "category": "food"},
    {"text": "싱거워", "category": "food"},
    {"text": "달아", "category": "food"},
    {"text": "매워", "category": "food"},
    {"text": "더 먹을게", "category": "food"},
    {"text": "그만 먹을게", "category": "food"},
    {"text": "뭐 먹고 싶어", "category": "food"},
    {"text": "밥은 됐어", "category": "food"},
    {"text": "죽 먹고 싶어", "category": "food"},
    {"text": "과일 먹고 싶어", "category": "food"},
    {"text": "간식 줘", "category": "food"},
    {"text": "뜨거워", "category": "food"},
    {"text": "차가워", "category": "food"},
    {"text": "조금만 줘", "category": "food"},
    {"text": "더 줘", "category": "food"},
    {"text": "국 많이 줘", "category": "food"},
    {"text": "반찬 없어", "category": "food"},
    {"text": "이거 맛있네", "category": "food"},

    # 감정/기분 (25개)
    {"text": "기분 좋아", "category": "emotion"},
    {"text": "기분 안 좋아", "category": "emotion"},
    {"text": "슬퍼", "category": "emotion"},
    {"text": "화났어", "category": "emotion"},
    {"text": "무서워", "category": "emotion"},
    {"text": "걱정돼", "category": "emotion"},
    {"text": "외로워", "category": "emotion"},
    {"text": "그립다", "category": "emotion"},
    {"text": "보고 싶어", "category": "emotion"},
    {"text": "행복해", "category": "emotion"},
    {"text": "즐거워", "category": "emotion"},
    {"text": "심심해", "category": "emotion"},
    {"text": "지루해", "category": "emotion"},
    {"text": "좀 답답해", "category": "emotion"},
    {"text": "괜찮아 걱정 마", "category": "emotion"},
    {"text": "나 괜찮아", "category": "emotion"},
    {"text": "별로 안 슬퍼", "category": "emotion"},
    {"text": "좋은 하루야", "category": "emotion"},
    {"text": "힘나", "category": "emotion"},
    {"text": "웃겨", "category": "emotion"},
    {"text": "재밌어", "category": "emotion"},
    {"text": "신나", "category": "emotion"},
    {"text": "고마워서 눈물나", "category": "emotion"},
    {"text": "그냥 좀 그래", "category": "emotion"},
    {"text": "많이 생각해", "category": "emotion"},
]

# 저장
with open(BASE_DIR / "data" / "user_sentences.json", "w", encoding="utf-8") as f:
    json.dump(user_sentences, f, ensure_ascii=False, indent=2)

with open(BASE_DIR / "data" / "general_sentences.json", "w", encoding="utf-8") as f:
    json.dump(general_sentences, f, ensure_ascii=False, indent=2)

print(f"샘플 데이터 생성 완료!")
print(f"  - 환자 문장: {len(user_sentences)}개 → data/user_sentences.json")
print(f"  - 일반 문장: {len(general_sentences)}개 → data/general_sentences.json")
