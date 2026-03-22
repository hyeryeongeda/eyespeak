"""
metrics.py - MLflow 기반 성능 측정 모듈
- API 응답 시간 기록
- 함수별 실행 시간 측정 데코레이터
- 추천 채택률 로깅
"""
import time
import functools
from collections import defaultdict
import mlflow

# ====== 설정 ======
EXPERIMENT_NAME = "eyespeak-recommend"
_initialized = False


def init_mlflow():
    """MLflow 초기화 (로컬 파일 저장)"""
    global _initialized
    if _initialized:
        return
    mlflow.set_tracking_uri("file:./mlruns")
    mlflow.set_experiment(EXPERIMENT_NAME)
    _initialized = True


# ====== 함수별 실행 시간 저장소 ======
_timing_data = defaultdict(list)  # {"함수명": [시간1, 시간2, ...]}
_api_timing_data = defaultdict(list)  # {"엔드포인트": [시간1, 시간2, ...]}


def measure_time(func):
    """함수 실행 시간 측정 데코레이터. _timing_data에 누적."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        _timing_data[func.__name__].append(elapsed_ms)
        return result
    return wrapper


def record_api_time(endpoint: str, elapsed_ms: float):
    """API 엔드포인트 응답 시간 기록"""
    _api_timing_data[endpoint].append(elapsed_ms)


def get_timing_summary() -> dict:
    """현재까지 측정된 시간 데이터 요약"""
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
    """현재 메트릭을 MLflow에 기록 (실험 1회분)"""
    init_mlflow()
    with mlflow.start_run(run_name=run_name):
        # 추천 채택률
        total_recommended = recommend_stats["recommend_calls"] * 3
        hit_rate = (recommend_stats["expression_use_from_recommend"] / total_recommended * 100) if total_recommended else 0
        pick_rate = (recommend_stats["expression_use_from_recommend"] / recommend_stats["expression_use_total"] * 100) if recommend_stats["expression_use_total"] else 0

        mlflow.log_metric("recommend_calls", recommend_stats["recommend_calls"])
        mlflow.log_metric("expression_use_total", recommend_stats["expression_use_total"])
        mlflow.log_metric("expression_use_from_recommend", recommend_stats["expression_use_from_recommend"])
        mlflow.log_metric("hit_rate_percent", round(hit_rate, 2))
        mlflow.log_metric("pick_rate_percent", round(pick_rate, 2))

        # 함수별 평균 실행 시간
        for name, times in _timing_data.items():
            if times:
                mlflow.log_metric(f"avg_ms_{name}", round(sum(times) / len(times), 2))
                mlflow.log_metric(f"count_{name}", len(times))

        # API별 평균 응답 시간
        for name, times in _api_timing_data.items():
            if times:
                mlflow.log_metric(f"avg_ms_api_{name}", round(sum(times) / len(times), 2))
                mlflow.log_metric(f"count_api_{name}", len(times))

        # 파라미터 (최적화 전/후 비교용)
        mlflow.log_param("framework", "FastAPI")
        mlflow.log_param("embedding_model", "paraphrase-multilingual-MiniLM-L12-v2")
        mlflow.log_param("llm_model", "gpt-4o-mini")

    print(f"[MLflow] 메트릭 기록 완료: {run_name}")


def reset_timing():
    """측정 데이터 초기화"""
    _timing_data.clear()
    _api_timing_data.clear()
