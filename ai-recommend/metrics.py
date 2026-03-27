"""
metrics.py - 성능 측정 모듈 (경량화 — mlflow 제거)
- 함수별 실행 시간 측정 데코레이터
- API 응답 시간 기록
"""
import time
import functools
from collections import defaultdict

# ====== 함수별 실행 시간 저장소 ======
_timing_data = defaultdict(list)
_api_timing_data = defaultdict(list)


def measure_time(func):
    """함수 실행 시간 측정 데코레이터"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        _timing_data[func.__name__].append(elapsed_ms)
        return result
    return wrapper


def record_api_time(endpoint: str, elapsed_ms: float):
    _api_timing_data[endpoint].append(elapsed_ms)


def get_timing_summary() -> dict:
    summary = {}
    for name, times in _timing_data.items():
        if times:
            summary[name] = {
                "count": len(times),
                "avg_ms": round(sum(times) / len(times), 2),
                "min_ms": round(min(times), 2),
                "max_ms": round(max(times), 2),
                "last_ms": round(times[-1], 2),
            }
    for name, times in _api_timing_data.items():
        if times:
            summary[f"api:{name}"] = {
                "count": len(times),
                "avg_ms": round(sum(times) / len(times), 2),
                "min_ms": round(min(times), 2),
                "max_ms": round(max(times), 2),
                "last_ms": round(times[-1], 2),
            }
    return summary


def log_to_mlflow(recommend_stats: dict, run_name: str = "auto"):
    """MLflow 제거됨 — 콘솔 출력으로 대체"""
    print(f"[metrics] {run_name}: {recommend_stats}")


def reset_timing():
    _timing_data.clear()
    _api_timing_data.clear()
