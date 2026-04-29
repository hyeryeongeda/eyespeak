"""
TTS API 서버 (FastAPI) - 공유 모델 + 환자별 레퍼런스 음성

하나의 파인튜닝된 XTTS v2 모델을 공유하고,
환자마다 레퍼런스 음성(ref WAV)만 등록하면 해당 환자의 목소리로 합성합니다.
(Zero-shot voice cloning — 환자별 추가 학습 불필요)

실행: uvicorn tts_server:app --host 0.0.0.0 --port 8000

환경변수:
  TTS_CACHE_MAX_SIZE     인메모리 캐시 최대 항목 수 (기본값: 200, LRU 방식)

디렉토리 구조:
  checkpoints/shared/             ← 공유 모델 (1벌)
  ├── best_model.pth (5.3G)
  ├── config.json
  ├── vocab.json
  ├── dvae.pth
  └── mel_stats.pth

  speaker_refs/                   ← 환자별 레퍼런스 음성
  ├── {patient_id}/
  │   ├── ref1.wav
  │   ├── ref2.wav
  │   └── profile.json
  └── ...
"""
import io
import json
import base64
import os
import shutil
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# 경로 설정
# ---------------------------------------------------------------------------
AI_TTS_DIR = Path(__file__).resolve().parent

SHARED_MODEL_DIR = AI_TTS_DIR / "checkpoints" / "shared"
SPEAKER_REFS_DIR = AI_TTS_DIR / "speaker_refs"
SPEAKER_REFS_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_SAMPLE_RATE = 24000
CACHE_MAX_SIZE = int(os.environ.get("TTS_CACHE_MAX_SIZE", "200"))

# 화자 음성 등록 검증 기준
MIN_AUDIO_DURATION = 3.0   # 초
MAX_AUDIO_DURATION = 30.0  # 초
MAX_REFS_PER_SPEAKER = 5   # 환자당 최대 레퍼런스 수

# 추론 파라미터
INFERENCE_PARAMS = {
    "gpt_cond_len": 12,
    "temperature": 0.72,
    "length_penalty": 1.0,
    "repetition_penalty": 2.5,
    "top_k": 50,
    "top_p": 0.88,
    "speed": 1.2,
}

app = FastAPI(
    title="TTS API",
    description="XTTS v2 공유 모델 기반 다중 환자 음성 합성 (Zero-shot Voice Cloning)",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 공유 모델 (서버 전체에서 1개만 로드)
# ---------------------------------------------------------------------------
_shared_model = None   # (model, config)
_model_lock = False     # 로딩 중 플래그


def _load_shared_model():
    """서버 시작 시 공유 모델을 1번만 로드."""
    global _shared_model

    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import Xtts

    config_path = SHARED_MODEL_DIR / "config.json"
    ckpt_path = SHARED_MODEL_DIR / "model.pth"
    vocab_path = SHARED_MODEL_DIR / "vocab.json"

    for p, name in [(config_path, "config.json"), (ckpt_path, "model.pth"), (vocab_path, "vocab.json")]:
        if not p.exists():
            raise FileNotFoundError(f"공유 모델 파일이 없습니다: {p}\ncheckpoints/shared/{name}을 확인하세요.")

    config = XttsConfig()
    config.load_json(str(config_path))
    model = Xtts.init_from_config(config)
    model.load_checkpoint(
        config,
        checkpoint_dir=str(SHARED_MODEL_DIR),
        checkpoint_path=str(ckpt_path),
        vocab_path=str(vocab_path),
        use_deepspeed=False,
    )
    if torch.cuda.is_available():
        model.cuda()

    _shared_model = (model, config)
    print(f" > 공유 모델 로드 완료: {SHARED_MODEL_DIR}")


def _get_model():
    """로드된 공유 모델 반환. 없으면 에러."""
    if _shared_model is None:
        raise HTTPException(status_code=503, detail="모델이 아직 로드되지 않았습니다. 서버 시작 중...")
    return _shared_model


# ---------------------------------------------------------------------------
# TTS 캐시 — (patient_id, text) → wav_bytes, LRU
# ---------------------------------------------------------------------------
_tts_cache: OrderedDict = OrderedDict()
_cache_hits = 0
_cache_misses = 0


def _cache_get(patient_id: str, text: str):
    global _cache_hits, _cache_misses
    key = (patient_id, text)
    if key in _tts_cache:
        _tts_cache.move_to_end(key)
        _cache_hits += 1
        return _tts_cache[key]
    _cache_misses += 1
    return None


def _cache_put(patient_id: str, text: str, wav_bytes: bytes):
    key = (patient_id, text)
    if key in _tts_cache:
        _tts_cache.move_to_end(key)
    else:
        if len(_tts_cache) >= CACHE_MAX_SIZE:
            _tts_cache.popitem(last=False)
        _tts_cache[key] = wav_bytes


def _cache_clear_patient(patient_id: str):
    keys = [k for k in _tts_cache if k[0] == patient_id]
    for k in keys:
        del _tts_cache[k]
    if keys:
        print(f" > 캐시 삭제: patient_id='{patient_id}' ({len(keys)}개)")


# ---------------------------------------------------------------------------
# 환자 레퍼런스 관리
# ---------------------------------------------------------------------------

def _get_patient_ref_dir(patient_id: str) -> Path:
    return SPEAKER_REFS_DIR / patient_id


def _get_speaker_refs(patient_id: str) -> list[str]:
    """환자의 레퍼런스 WAV 파일 경로 리스트 반환."""
    ref_dir = _get_patient_ref_dir(patient_id)
    if not ref_dir.exists():
        return []
    refs = sorted(ref_dir.glob("ref*.wav"))
    return [str(r) for r in refs]


def _list_registered_patients() -> list[str]:
    """레퍼런스가 등록된 환자 목록."""
    patients = []
    if SPEAKER_REFS_DIR.is_dir():
        for d in sorted(SPEAKER_REFS_DIR.iterdir()):
            if d.is_dir() and list(d.glob("ref*.wav")):
                patients.append(d.name)
    return patients


def _load_patient_profile(patient_id: str) -> dict:
    profile_path = _get_patient_ref_dir(patient_id) / "profile.json"
    if profile_path.exists():
        return json.loads(profile_path.read_text(encoding="utf-8"))
    return {}


def _save_patient_profile(patient_id: str, profile: dict):
    profile_path = _get_patient_ref_dir(patient_id) / "profile.json"
    profile_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")


def _validate_audio(file_bytes: bytes) -> float:
    """업로드된 오디오의 길이(초)를 검증하고 반환."""
    buf = io.BytesIO(file_bytes)
    try:
        info = torchaudio.info(buf)
    except Exception:
        raise HTTPException(status_code=400, detail="유효한 WAV 파일이 아닙니다.")
    duration = info.num_frames / info.sample_rate
    if duration < MIN_AUDIO_DURATION:
        raise HTTPException(
            status_code=400,
            detail=f"음성이 너무 짧습니다 ({duration:.1f}초). 최소 {MIN_AUDIO_DURATION}초 이상이어야 합니다.",
        )
    if duration > MAX_AUDIO_DURATION:
        raise HTTPException(
            status_code=400,
            detail=f"음성이 너무 깁니다 ({duration:.1f}초). 최대 {MAX_AUDIO_DURATION}초 이하여야 합니다.",
        )
    return duration


# ---------------------------------------------------------------------------
# 음성 합성
# ---------------------------------------------------------------------------

def _synthesize_wav_bytes(text: str, patient_id: str) -> tuple[bytes, bool]:
    cached = _cache_get(patient_id, text)
    if cached is not None:
        return cached, True

    model, config = _get_model()

    # 환자 레퍼런스 WAV 찾기
    ref_wavs = _get_speaker_refs(patient_id)
    if not ref_wavs:
        raise HTTPException(
            status_code=404,
            detail=f"환자 '{patient_id}'의 레퍼런스 음성이 없습니다. 먼저 POST /patients/{patient_id}/voice 로 등록하세요.",
        )

    speaker_wav = ref_wavs if len(ref_wavs) > 1 else ref_wavs[0]

    try:
        out = model.synthesize(
            text, config,
            speaker_wav=speaker_wav,
            language="ko",
            **INFERENCE_PARAMS,
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
            detail=f"합성 결과가 비어 있습니다 (샘플 수: {wav.shape[-1]}). 레퍼런스 파일·텍스트를 확인하세요.",
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
# 라이프사이클
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    try:
        _load_shared_model()
    except FileNotFoundError as e:
        print(f" > 경고: 공유 모델 로드 실패: {e}")
        print(f" > checkpoints/shared/ 에 모델 파일을 배치한 후 서버를 재시작하세요.")

    patients = _list_registered_patients()
    print(f" > 등록된 환자: {len(patients)}명 {patients}")


@app.get("/")
def root():
    return {
        "message": "TTS API (공유 모델 방식)",
        "docs": "/docs",
        "endpoints": {
            "tts": "POST /tts",
            "patients": "GET /patients",
            "register_voice": "POST /patients/{patient_id}/voice",
            "get_patient": "GET /patients/{patient_id}",
            "delete_patient": "DELETE /patients/{patient_id}",
            "add_refs": "POST /patients/{patient_id}/refs",
            "health": "GET /health",
            "cache_stats": "GET /cache/stats",
            "cache_clear": "DELETE /cache",
        },
    }


# ---------------------------------------------------------------------------
# 헬스 체크
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok" if _shared_model is not None else "model_not_loaded",
        "model_dir": str(SHARED_MODEL_DIR),
        "model_loaded": _shared_model is not None,
        "registered_patients": len(_list_registered_patients()),
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


# ---------------------------------------------------------------------------
# 화자 음성 등록 API
# ---------------------------------------------------------------------------

@app.post("/patients/{patient_id}/voice")
async def register_voice(
    patient_id: str,
    name: str = Form("", description="환자 이름 (선택)"),
    files: List[UploadFile] = File(..., description="레퍼런스 음성 WAV 파일 (1~5개, 각 3~30초)"),
):
    """
    환자 음성을 등록합니다. 기존 레퍼런스가 있으면 교체합니다.
    - patient_id: 환자 고유 ID (백엔드 matching_id)
    - files: WAV 음성 파일 1~5개 (각 3~30초, 잡음 적은 깨끗한 음성 권장)
    """
    if len(files) > MAX_REFS_PER_SPEAKER:
        raise HTTPException(
            status_code=400,
            detail=f"레퍼런스는 최대 {MAX_REFS_PER_SPEAKER}개까지 가능합니다.",
        )

    ref_dir = _get_patient_ref_dir(patient_id)
    ref_dir.mkdir(parents=True, exist_ok=True)

    # 기존 ref 파일 제거
    for old_ref in ref_dir.glob("ref*.wav"):
        old_ref.unlink()

    saved_refs = []
    for i, f in enumerate(files, 1):
        content = await f.read()
        duration = _validate_audio(content)
        ref_path = ref_dir / f"ref{i}.wav"
        ref_path.write_bytes(content)
        saved_refs.append({"file": f"ref{i}.wav", "duration": round(duration, 1)})

    profile = {
        "patient_id": patient_id,
        "name": name,
        "registered_at": datetime.now().isoformat(),
        "refs": saved_refs,
    }
    _save_patient_profile(patient_id, profile)
    _cache_clear_patient(patient_id)

    print(f" > 음성 등록: patient_id='{patient_id}', refs={len(saved_refs)}개")
    return {"message": f"환자 '{patient_id}' 음성 등록 완료", "profile": profile}


@app.get("/patients")
def list_patients():
    patients = _list_registered_patients()
    patients_info = []
    for pid in patients:
        profile = _load_patient_profile(pid)
        ref_count = len(_get_speaker_refs(pid))
        patients_info.append({
            "patient_id": pid,
            "name": profile.get("name", ""),
            "ref_count": ref_count,
            "registered_at": profile.get("registered_at", ""),
        })
    return {"patients": patients_info, "total": len(patients)}


@app.get("/patients/{patient_id}")
def get_patient(patient_id: str):
    """환자 상세 정보를 반환합니다."""
    ref_dir = _get_patient_ref_dir(patient_id)
    if not ref_dir.exists():
        raise HTTPException(status_code=404, detail=f"등록되지 않은 환자입니다: {patient_id}")
    profile = _load_patient_profile(patient_id)
    refs = _get_speaker_refs(patient_id)
    profile["refs"] = [Path(r).name for r in refs]
    profile["ref_count"] = len(refs)
    return profile


@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: str):
    """환자 레퍼런스 데이터를 삭제합니다."""
    ref_dir = _get_patient_ref_dir(patient_id)
    if not ref_dir.exists():
        raise HTTPException(status_code=404, detail=f"등록되지 않은 환자입니다: {patient_id}")
    _cache_clear_patient(patient_id)
    shutil.rmtree(ref_dir)
    print(f" > 환자 삭제: patient_id='{patient_id}'")
    return {"message": f"환자 '{patient_id}' 삭제 완료"}


@app.post("/patients/{patient_id}/refs")
async def add_patient_refs(
    patient_id: str,
    files: List[UploadFile] = File(..., description="추가할 레퍼런스 음성 WAV 파일"),
):
    """기존 환자에 레퍼런스 음성을 추가합니다."""
    ref_dir = _get_patient_ref_dir(patient_id)
    if not ref_dir.exists():
        raise HTTPException(status_code=404, detail=f"등록되지 않은 환자입니다: {patient_id}")

    existing_refs = list(ref_dir.glob("ref*.wav"))
    if len(existing_refs) + len(files) > MAX_REFS_PER_SPEAKER:
        raise HTTPException(
            status_code=400,
            detail=f"레퍼런스 최대 {MAX_REFS_PER_SPEAKER}개. 현재 {len(existing_refs)}개, "
                   f"{MAX_REFS_PER_SPEAKER - len(existing_refs)}개 추가 가능.",
        )

    new_refs = []
    for i, f in enumerate(files, len(existing_refs) + 1):
        content = await f.read()
        duration = _validate_audio(content)
        ref_path = ref_dir / f"ref{i}.wav"
        ref_path.write_bytes(content)
        new_refs.append({"file": f"ref{i}.wav", "duration": round(duration, 1)})

    # 프로필 업데이트
    profile = _load_patient_profile(patient_id)
    profile.setdefault("refs", []).extend(new_refs)
    _save_patient_profile(patient_id, profile)
    _cache_clear_patient(patient_id)

    return {
        "message": f"{len(new_refs)}개 레퍼런스 추가 완료",
        "total_refs": len(existing_refs) + len(new_refs),
    }


# ---------------------------------------------------------------------------
# TTS 합성 엔드포인트
# ---------------------------------------------------------------------------

@app.post("/tts")
def tts(request: TTSRequest, format: str = "wav"):
    """
    텍스트를 음성으로 변환합니다.
    - patient_id: 환자 식별자 (백엔드 matching_id)
    - format=wav  : wav 파일 반환
    - format=base64: JSON { audio_base64, sample_rate, patient_id, cached }
    """
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text 필드가 비어 있습니다.")

    wav_bytes, from_cache = _synthesize_wav_bytes(text, request.patient_id)

    if format == "base64":
        return JSONResponse(content={
            "audio_base64": base64.b64encode(wav_bytes).decode("ascii"),
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


# ---------------------------------------------------------------------------
# 캐시 관리
# ---------------------------------------------------------------------------

@app.get("/cache/stats")
def cache_stats():
    size = len(_tts_cache)
    total_bytes = sum(len(v) for v in _tts_cache.values())
    total = _cache_hits + _cache_misses
    hit_rate = round(_cache_hits / total * 100, 1) if total > 0 else 0.0
    return {
        "hits": _cache_hits, "misses": _cache_misses,
        "hit_rate_pct": hit_rate,
        "size": size, "max_size": CACHE_MAX_SIZE,
        "memory_bytes": total_bytes,
    }


@app.delete("/cache")
def clear_cache(patient_id: str = None):
    global _cache_hits, _cache_misses
    if patient_id:
        _cache_clear_patient(patient_id)
        return {"deleted": "patient", "patient_id": patient_id}
    count = len(_tts_cache)
    _tts_cache.clear()
    _cache_hits = _cache_misses = 0
    return {"deleted": "all", "count": count}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
