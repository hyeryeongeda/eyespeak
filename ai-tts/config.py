"""
프로젝트 설정: .env 에서 API 키 등 로드.
사용 예: from config import get_api_key
"""
import os
from pathlib import Path

# 프로젝트 루트 기준 .env 로드 (다른 폴더에서 실행해도 동작하도록)
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_path)


def get_api_key():
    """GEMINI_API_KEY 또는 GMS_KEY 를 반환. 없으면 None."""
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("GMS_KEY")
