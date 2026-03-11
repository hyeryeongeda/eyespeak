"""
임베딩 서비스 - 로컬/GMS 자동 전환
환경변수 USE_GMS=true면 GMS, 아니면 로컬
"""
import os
import numpy as np
from dotenv import load_dotenv

load_dotenv()

USE_GMS = os.getenv("USE_GMS", "false").lower() == "true"

if USE_GMS:
    # GMS 버전
    print("[임베딩] GMS text-embedding-3-large 사용")
    from openai import OpenAI

    client = OpenAI(
        api_key=os.getenv("GMS_KEY"),
        base_url="https://gms.ssafy.io/gmsapi/api.openai.com/v1"
    )
    EMBEDDING_DIM = 3072

    def get_embedding(text: str) -> np.ndarray:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-3-large"
        )
        return np.array(response.data[0].embedding, dtype=np.float32)

    def get_embeddings_batch(texts: list) -> np.ndarray:
        response = client.embeddings.create(
            input=texts,
            model="text-embedding-3-large"
        )
        embeddings = sorted(response.data, key=lambda x: x.index)
        return np.array([item.embedding for item in embeddings], dtype=np.float32)

else:
    # 로컬 버전 (sentence-transformers)
    print("[임베딩] 로컬 sentence-transformers 사용")
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    EMBEDDING_DIM = 384

    def get_embedding(text: str) -> np.ndarray:
        return model.encode(text, convert_to_numpy=True)

    def get_embeddings_batch(texts: list) -> np.ndarray:
        return model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
