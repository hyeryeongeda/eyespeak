"""
TTS API 서버 (FastAPI) - 다중 환자 모델 지원 + 응답 캐싱
학습된 XTTS v2 모델로 텍스트 → 음성 변환 후 wav/base64 반환.

실행: uvicorn tts_server:app --host 0.0.0.0 --port 8000
(반드시 이 파일이 있는 폴더에서 실행: cd "personal TTS/xtts_training_ko" 후 실행)

환경변수:
  TTS_MAX_LOADED_MODELS  동시에 GPU에 올릴 최대 환자 모델 수 (기본값: 3, LRU 방식)
  TTS_CACHE_MAX_SIZE     인메모리 캐시 최대 항목 수 (기본값: 200, LRU 방식)

체크포인트 디렉토리 구조:
  checkpoints/{patient_id}/best_model.pth
  checkpoints/{patient_id}/config.json
  checkpoints/{patient_id}/speaker_ref.wav   ← 화자 참조 음성
"""
import io
import base64
import os
import threading
from collections import OrderedDict
from pathlib import Path

import numpy as np
import torch
import compat_patches  # noqa: F401  torch.load 패치 + isin_mps_friendly 패치
import torchaudio
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent
os.chdir(PROJECT_ROOT)

CHECKPOINTS_DIR = PROJECT_ROOT / "checkpoints"
RUN_TRAINING = PROJECT_ROOT / "run" / "training"
VOCAB_PATH = RUN_TRAINING / "XTTS_v2.0_original_model_files" / "vocab.json"
OUTPUT_SAMPLE_RATE = 24000

# 동시에 GPU에 올릴 수 있는 최대 환자 모델 수 (LRU 방식으로 초과 시 오래된 모델 언로드)
MAX_LOADED_MODELS = int(os.environ.get("TTS_MAX_LOADED_MODELS", "3"))
# 인메모리 TTS 캐시 최대 항목 수 (patient_id + text) → wav bytes
CACHE_MAX_SIZE = int(os.environ.get("TTS_CACHE_MAX_SIZE", "200"))

app = FastAPI(title="TTS API", description="XTTS v2 파인튜닝 모델 음성 합성 (다중 환자 지원)")

# { patient_id: {"model": Xtts, "config": XttsConfig, "speaker_wav": str} }
# OrderedDict: 마지막으로 사용된 항목이 뒤에 위치 → LRU 구현
_model_registry: OrderedDict = OrderedDict()
_registry_lock = threading.Lock()

# ---------------------------------------------------------------------------
# TTS 캐시 — (patient_id, text) → wav_bytes, LRU 방식
# ---------------------------------------------------------------------------

# { (patient_id, text): wav_bytes }
_tts_cache: OrderedDict = OrderedDict()
_cache_lock = threading.Lock()
_cache_hits = 0
_cache_misses = 0


def _cache_get(patient_id: str, text: str):
    """캐시 조회. 히트 시 LRU 갱신 후 wav_bytes 반환, 미스 시 None."""
    global _cache_hits, _cache_misses
    key = (patient_id, text)
    with _cache_lock:
        if key in _tts_cache:
            _tts_cache.move_to_end(key)
            _cache_hits += 1
            return _tts_cache[key]
        _cache_misses += 1
        return None


def _cache_put(patient_id: str, text: str, wav_bytes: bytes):
    """캐시 저장. CACHE_MAX_SIZE 초과 시 가장 오래된 항목 제거."""
    key = (patient_id, text)
    with _cache_lock:
        if key in _tts_cache:
            _tts_cache.move_to_end(key)
        else:
            if len(_tts_cache) >= CACHE_MAX_SIZE:
                _tts_cache.popitem(last=False)
            _tts_cache[key] = wav_bytes


def _cache_clear_patient(patient_id: str):
    """특정 환자의 캐시 항목 전체 삭제 (모델 재로드 시 호출)."""
    with _cache_lock:
        keys = [k for k in _tts_cache if k[0] == patient_id]
        for k in keys:
            del _tts_cache[k]
    if keys:
        print(f" > 캐시 삭제: patient_id='{patient_id}' ({len(keys)}개)")


# ---------------------------------------------------------------------------
# 체크포인트 탐색
# ---------------------------------------------------------------------------

def _get_patient_checkpoint(patient_id: str):
    """patient_id 에 해당하는 (ckpt_dir, ckpt_path, config_path, speaker_wav) 반환.

    탐색 순서:
      1) checkpoints/{patient_id}/best_model.pth + config.json + speaker_ref.wav
      2) patient_id == "default" → 기존 단일 모델 경로 호환
         - checkpoints/best_model.pth + config.json
         - run/training/GPT_XTTS_*/best_model.pth (최신 run)
    """
    patient_dir = CHECKPOINTS_DIR / patient_id
    if patient_dir.is_dir():
        pth = patient_dir / "best_model.pth"
        cfg = patient_dir / "config.json"
        spk = patient_dir / "speaker_ref.wav"
        if pth.exists() and cfg.exists() and spk.exists():
            return str(patient_dir), str(pth), str(cfg), str(spk)

    if patient_id == "default":
        # checkpoints/ 루트에 단일 모델이 있는 기존 구조 호환
        if (CHECKPOINTS_DIR / "best_model.pth").exists() and (CHECKPOINTS_DIR / "config.json").exists():
            spk = PROJECT_ROOT / "wavs" / "audio1.wav"
            return (
                str(CHECKPOINTS_DIR),
                str(CHECKPOINTS_DIR / "best_model.pth"),
                str(CHECKPOINTS_DIR / "config.json"),
                str(spk),
            )

        # run/training 최신 run
        if RUN_TRAINING.exists():
            dirs = sorted(d for d in RUN_TRAINING.iterdir() if d.is_dir() and d.name.startswith("GPT_XTTS_"))
            if dirs:
                latest = dirs[-1]
                pth = latest / "best_model.pth"
                cfg = latest / "config.json"
                spk = PROJECT_ROOT / "wavs" / "audio1.wav"
                if pth.exists() and cfg.exists():
                    return str(latest), str(pth), str(cfg), str(spk)

    return None, None, None, None


def _list_available_patients():
    """checkpoints/ 하위에서 유효한 환자 모델 목록 반환."""
    patients = []

    if CHECKPOINTS_DIR.is_dir():
        for d in sorted(CHECKPOINTS_DIR.iterdir()):
            if (
                d.is_dir()
                and (d / "best_model.pth").exists()
                and (d / "config.json").exists()
                and (d / "speaker_ref.wav").exists()
            ):
                patients.append(d.name)

    # 기존 단일 모델 구조("default") 호환
    if "default" not in patients:
        ckpt_dir, _, _, _ = _get_patient_checkpoint("default")
        if ckpt_dir:
            patients.insert(0, "default")

    return patients


# ---------------------------------------------------------------------------
# 모델 로드 / LRU 관리
# ---------------------------------------------------------------------------

def _load_model_for_patient(patient_id: str):
    """patient_id 모델을 로드해 레지스트리에 등록. LRU 초과 시 오래된 모델 언로드."""
    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import Xtts

    ckpt_dir, ckpt_path, config_path, speaker_wav = _get_patient_checkpoint(patient_id)
    if not ckpt_dir:
        raise FileNotFoundError(
            f"환자 '{patient_id}' 모델을 찾을 수 없습니다. "
            f"checkpoints/{patient_id}/best_model.pth + config.json + speaker_ref.wav 를 확인하세요."
        )
    if not VOCAB_PATH.exists():
        raise FileNotFoundError(f"vocab.json을 찾을 수 없습니다: {VOCAB_PATH}")

    config = XttsConfig()
    config.load_json(config_path)
    model = Xtts.init_from_config(config)
    model.load_checkpoint(
        config,
        checkpoint_dir=ckpt_dir,
        checkpoint_path=ckpt_path,
        vocab_path=str(VOCAB_PATH),
        use_deepspeed=False,
    )
    if torch.cuda.is_available():
        model.cuda()

    with _registry_lock:
        # LRU: 최대 개수 초과 시 가장 오래된 모델 언로드
        while len(_model_registry) >= MAX_LOADED_MODELS:
            evict_id, evict_entry = _model_registry.popitem(last=False)
            del evict_entry["model"]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print(f" > 모델 언로드 (LRU): patient_id='{evict_id}'")
            _cache_clear_patient(evict_id)  # 언로드된 환자 캐시 제거

        _model_registry[patient_id] = {
            "model": model,
            "config": config,
            "speaker_wav": speaker_wav,
        }

    print(f" > 모델 로드 완료: patient_id='{patient_id}'")


def _get_or_load(patient_id: str) -> dict:
    """레지스트리에서 모델 반환. 없으면 로드 후 반환. LRU 순서 갱신."""
    with _registry_lock:
        if patient_id in _model_registry:
            _model_registry.move_to_end(patient_id)  # LRU 갱신
            return _model_registry[patient_id]

    # 락 밖에서 로드 (시간이 걸리는 작업)
    _load_model_for_patient(patient_id)

    with _registry_lock:
        return _model_registry[patient_id]


# ---------------------------------------------------------------------------
# 음성 합성
# ---------------------------------------------------------------------------

def _synthesize_wav_bytes(text: str, patient_id: str) -> tuple[bytes, bool]:
    """wav_bytes 와 캐시 히트 여부(bool) 반환."""
    # 캐시 조회
    cached = _cache_get(patient_id, text)
    if cached is not None:
        return cached, True

    # 캐시 미스 → GPU 추론
    entry = _get_or_load(patient_id)
    model = entry["model"]
    config = entry["config"]
    speaker_wav = entry["speaker_wav"]

    if not Path(speaker_wav).exists():
        raise HTTPException(status_code=500, detail=f"화자 참조 파일이 없습니다: {speaker_wav}")

    try:
        out = model.synthesize(
            text,
            config,
            speaker_wav=speaker_wav,
            language="ko",
            gpt_cond_len=6,
            temperature=0.6,
            length_penalty=1.0,
            repetition_penalty=5.0,
            top_k=50,
            top_p=0.85,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"합성 실패: {str(e)}")

    wav = out["wav"]
    if hasattr(wav, "numpy"):
        wav = wav.numpy()
    wav = np.asarray(wav, dtype=np.float32)
    if wav.ndim == 1:
        wav = wav[np.newaxis, :]
    if wav.size == 0 or wav.shape[-1] < 1000:
        raise HTTPException(
            status_code=500,
            detail=f"합성 결과가 비어 있습니다 (샘플 수: {wav.shape[-1]}). 화자 참조 파일·체크포인트·텍스트를 확인하세요.",
        )

    buf = io.BytesIO()
    torchaudio.save(buf, torch.from_numpy(wav), OUTPUT_SAMPLE_RATE, format="wav")
    wav_bytes = buf.getvalue()

    _cache_put(patient_id, text, wav_bytes)
    return wav_bytes, False


# ---------------------------------------------------------------------------
# API 스키마
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    text: str
    patient_id: str = "default"


# ---------------------------------------------------------------------------
# 라이프사이클 / 엔드포인트
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    patients = _list_available_patients()
    if patients:
        try:
            _load_model_for_patient(patients[0])
        except Exception as e:
            print(f" > 경고: 시작 시 모델 로드 실패 ({patients[0]}): {e}")
    else:
        print(" > 경고: 사용 가능한 환자 모델이 없습니다. checkpoints/ 를 확인하세요.")


@app.get("/")
def root():
    return {
        "message": "TTS API",
        "docs": "/docs",
        "endpoints": {
            "tts": "POST /tts",
            "patients": "GET /patients",
            "cache_stats": "GET /cache/stats",
            "cache_clear": "DELETE /cache",
        },
    }


@app.get("/patients")
def list_patients():
    """사용 가능한 환자 모델 목록 및 현재 GPU 로드 상태 반환."""
    available = _list_available_patients()
    with _registry_lock:
        loaded = list(_model_registry.keys())
    return {
        "available": available,
        "loaded": loaded,
        "max_loaded": MAX_LOADED_MODELS,
    }


@app.get("/cache/stats")
def cache_stats():
    """캐시 히트율 및 현재 크기 반환."""
    with _cache_lock:
        size = len(_tts_cache)
        total_bytes = sum(len(v) for v in _tts_cache.values())
    total = _cache_hits + _cache_misses
    hit_rate = round(_cache_hits / total * 100, 1) if total > 0 else 0.0
    return {
        "hits": _cache_hits,
        "misses": _cache_misses,
        "hit_rate_pct": hit_rate,
        "size": size,
        "max_size": CACHE_MAX_SIZE,
        "memory_bytes": total_bytes,
    }


@app.delete("/cache")
def clear_cache(patient_id: str = None):
    """캐시 전체 또는 특정 환자 캐시 삭제.
    - patient_id 미지정: 전체 삭제
    - patient_id 지정: 해당 환자 항목만 삭제
    """
    global _cache_hits, _cache_misses
    if patient_id:
        _cache_clear_patient(patient_id)
        return {"deleted": "patient", "patient_id": patient_id}
    with _cache_lock:
        count = len(_tts_cache)
        _tts_cache.clear()
        _cache_hits = 0
        _cache_misses = 0
    return {"deleted": "all", "count": count}


@app.post("/tts")
def tts(request: TTSRequest, format: str = "wav"):
    """
    텍스트를 음성으로 변환합니다.
    - patient_id: 환자 식별자 (기본값: "default")
    - format=wav  (기본): wav 파일 반환 (Content-Type: audio/wav)
    - format=base64: JSON { "audio_base64": "...", "sample_rate": 24000, "patient_id": "...", "cached": bool } 반환
    """
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text 필드가 비어 있습니다.")

    wav_bytes, from_cache = _synthesize_wav_bytes(text, request.patient_id)

    if format == "base64":
        b64 = base64.b64encode(wav_bytes).decode("ascii")
        return JSONResponse(content={
            "audio_base64": b64,
            "sample_rate": OUTPUT_SAMPLE_RATE,
            "patient_id": request.patient_id,
            "cached": from_cache,
        })

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "inline; filename=tts.wav",
            "Content-Length": str(len(wav_bytes)),
            "X-Cache": "HIT" if from_cache else "MISS",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
