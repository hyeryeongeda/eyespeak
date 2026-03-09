"""
FAISS 벡터 DB 관리
"""
import faiss
import numpy as np
from embedding_service import EMBEDDING_DIM


class VectorDB:
    def __init__(self):
        """차원을 embedding_service에서 자동으로 가져옴"""
        self.dimension = EMBEDDING_DIM
        self.index = faiss.IndexFlatIP(self.dimension)  # 내적 유사도 (정규화된 벡터 → 코사인 유사도)
        self.sentences = []

    def add_sentences(self, sentences: list, embeddings: np.ndarray):
        """
        문장과 임베딩 추가

        Args:
            sentences: 문장 텍스트 리스트
            embeddings: 임베딩 벡터 (N, EMBEDDING_DIM)
        """
        if len(sentences) == 0:
            return

        embeddings = np.array(embeddings, dtype=np.float32)
        self.index.add(embeddings)
        self.sentences.extend(sentences)

    def search(self, query_embedding: np.ndarray, top_k=20) -> tuple:
        """
        유사 문장 검색

        Args:
            query_embedding: 쿼리 임베딩 벡터
            top_k: 반환할 결과 개수

        Returns:
            (distances, indices): 유사도 점수와 인덱스
        """
        if self.index.ntotal == 0:
            return np.array([]), np.array([])

        top_k = min(top_k, self.index.ntotal)
        query = np.array(query_embedding, dtype=np.float32).reshape(1, -1)
        distances, indices = self.index.search(query, top_k)
        return distances[0], indices[0]

    def get_sentences_by_indices(self, indices: list) -> list:
        """인덱스로 문장 가져오기"""
        return [self.sentences[i] for i in indices if 0 <= i < len(self.sentences)]
