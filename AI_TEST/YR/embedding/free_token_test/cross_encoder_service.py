"""
sentence-transformers Cross-encoder를 사용한 재랭킹 서비스
"""
from sentence_transformers import CrossEncoder


class CrossEncoderService:
    def __init__(self, model_name="cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"):
        """
        Cross-encoder 모델 로드

        Args:
            model_name: Hugging Face 모델명
        """
        print(f"[Cross-encoder] 모델 로드 중: {model_name}")
        self.model = CrossEncoder(model_name)
        print("[Cross-encoder] 모델 로드 완료")

    def rerank(self, query: str, candidates: list) -> list:
        """
        후보 문장들을 재랭킹

        Args:
            query: 보호자 질문
            candidates: 후보 문장 리스트

        Returns:
            재랭킹 점수 리스트 (같은 순서)
        """
        if not candidates:
            return []

        pairs = [(query, cand) for cand in candidates]
        scores = self.model.predict(pairs)
        return scores.tolist()
