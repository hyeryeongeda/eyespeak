"""
TTS API 서버 (FastAPI) - 다중 환자 모델 지원 + 응답 캐싱 + 비동기 학습
학습된 XTTS v2 모델로 텍스트 → 음성 변환 후 wav/base64 반환.

실행: uvicorn tts_server:app --host 0.0.0.0 --port 8000
(ai-tts/ 폴더에서 실행: cd ai-tts && uvicorn tts_server:app ...)

환경변수:
  TTS_MAX_LOADED_MODELS  동시에 GPU에 올릴 최대 환자 모델 수 (기본값: 3, LRU 방식)
  TTS_CACHE_MAX_SIZE     인메모리 캐시 최대 항목 수 (기본값: 200, LRU 방식)

체크포인트 디렉토리 구조 (REPO_ROOT 기준):
  checkpoints/{patient_id}/best_model.pth
  checkpoints/{patient_id}/config.json
  checkpoints/{patient_id}/speaker_ref.wav   ← 화자 참조 음성

학습 데이터 구조 (REPO_ROOT 기준):
  data/{patient_id}/wavs_new/metadata.txt
  data/{patient_id}/wavs_new/audio1.wav ...
"""
import dataclasses
import io
import json
import base64
import os
import shutil
import subprocess
import threading
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import numpy as np
import torch
import compat_patches  # noqa: F401  torch.load 패치 + isin_mps_friendly 패치
import torchaudio
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

AI_TTS_DIR = Path(__file__).resolve().parent   # …/ai-tts/
REPO_ROOT   = AI_TTS_DIR.parent                # 리포 루트 (Jenkinsfile, backend/ 등)
os.chdir(REPO_ROOT)

CHECKPOINTS_DIR = REPO_ROOT / "checkpoints"
RUN_TRAINING    = REPO_ROOT / "run" / "training"
VOCAB_PATH      = RUN_TRAINING / "XTTS_v2.0_original_model_files" / "vocab.json"
TRAIN_SCRIPT    = AI_TTS_DIR / "train_gpt_xtts.py"
OUTPUT_SAMPLE_RATE = 24000

MAX_LOADED_MODELS = int(os.environ.get("TTS_MAX_LOADED_MODELS", "3"))
CACHE_MAX_SIZE    = int(os.environ.get("TTS_CACHE_MAX_SIZE", "200"))

# 화자 음성 등록 검증 기준
MIN_AUDIO_DURATION = 3.0   # 초
MAX_AUDIO_DURATION = 30.0  # 초
MAX_REFS_PER_SPEAKER = 5   # 환자당 최대 레퍼런스 수

# Phase 4: 추론 파라미터 최적화 (새 모델 기준)
INFERENCE_PARAMS = {
    "gpt_cond_len": 12,
    "temperature": 0.72,
    "length_penalty": 1.0,
    "repetition_penalty": 2.5,
    "top_k": 50,
    "top_p": 0.88,
    "speed": 1.2,
}

app = FastAPI(title="TTS API", description="XTTS v2 파인튜닝 모델 음성 합성 (다중 환자 지원)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 모델 레지스트리 — { patient_id: {model, config, speaker_wav} }, LRU
# ---------------------------------------------------------------------------
_model_registry: OrderedDict = OrderedDict()
_registry_lock  = threading.Lock()

# ---------------------------------------------------------------------------
# TTS 캐시 — (patient_id, text) → wav_bytes, LRU
# ---------------------------------------------------------------------------
_tts_cache:    OrderedDict = OrderedDict()
_cache_lock   = threading.Lock()
_cache_hits   = 0
_cache_misses = 0


def _cache_get(patient_id: str, text: str):
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
    key = (patient_id, text)
    with _cache_lock:
        if key in _tts_cache:
            _tts_cache.move_to_end(key)
        else:
            if len(_tts_cache) >= CACHE_MAX_SIZE:
                _tts_cache.popitem(last=False)
            _tts_cache[key] = wav_bytes


def _cache_clear_patient(patient_id: str):
    with _cache_lock:
        keys = [k for k in _tts_cache if k[0] == patient_id]
        for k in keys:
            del _tts_cache[k]
    if keys:
        print(f" > 캐시 삭제: patient_id='{patient_id}' ({len(keys)}개)")


# ---------------------------------------------------------------------------
# 비동기 학습 — subprocess 기반 job 관리
# ---------------------------------------------------------------------------

@dataclasses.dataclass
class _TrainJob:
    process:    subprocess.Popen
    status:     str          # running | completed | failed | cancelled
    started_at: datetime
    log_path:   Path
    patient_id: str
    epochs:     int
    batch_size: int


_train_jobs: dict[str, _TrainJob] = {}
_train_lock = threading.Lock()


def _poll_job(patient_id: str) -> Optional[_TrainJob]:
    """프로세스 종료 여부를 확인해 status를 갱신 후 job 반환."""
    with _train_lock:
        job = _train_jobs.get(patient_id)
        if job is None or job.status != "running":
            return job
        rc = job.process.poll()
        if rc is not None:
            job.status = "completed" if rc == 0 else "failed"
            if rc == 0:
                _deploy_trained_model(patient_id)
    return job


def _deploy_trained_model(patient_id: str):
    """학습 완료 후 best_model.pth → checkpoints/{patient_id}/ 복사 및 캐시 무효화."""
    import shutil

    train_out = RUN_TRAINING / patient_id
    dirs = sorted(train_out.glob("GPT_XTTS_*")) if train_out.exists() else []
    if not dirs:
        dirs = sorted(RUN_TRAINING.glob("GPT_XTTS_*")) if RUN_TRAINING.exists() else []
    if not dirs:
        print(f" > 배포 실패: GPT_XTTS_* 디렉토리를 찾을 수 없음 ({train_out})")
        return

    latest  = dirs[-1]
    src_pth = latest / "best_model.pth"
    src_cfg = latest / "config.json"

    if not src_pth.exists():
        print(f" > 배포 실패: {src_pth} 없음")
        return

    dest_dir = CHECKPOINTS_DIR / patient_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_pth, dest_dir / "best_model.pth")
    if src_cfg.exists():
        shutil.copy2(src_cfg, dest_dir / "config.json")

    # 기존 로드 모델 및 캐시 무효화
    _cache_clear_patient(patient_id)
    with _registry_lock:
        if patient_id in _model_registry:
            del _model_registry[patient_id]["model"]
            del _model_registry[patient_id]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    print(f" > 모델 배포 완료: patient_id='{patient_id}' → {dest_dir}")


# ---------------------------------------------------------------------------
# 체크포인트 탐색
# ---------------------------------------------------------------------------

def _get_speaker_refs(patient_dir: Path):
    """환자 디렉토리에서 레퍼런스 WAV 파일을 찾아 반환 (다중 지원)."""
    # ref1.wav, ref2.wav ... 형태 우선
    refs = sorted(patient_dir.glob("ref*.wav"))
    if refs:
        return [str(r) for r in refs]
    # speaker_ref.wav 폴백
    spk = patient_dir / "speaker_ref.wav"
    if spk.exists():
        return [str(spk)]
    return []


def _get_patient_checkpoint(patient_id: str):
    patient_dir = CHECKPOINTS_DIR / patient_id
    if patient_dir.is_dir():
        pth = patient_dir / "best_model.pth"
        cfg = patient_dir / "config.json"
        refs = _get_speaker_refs(patient_dir)
        if pth.exists() and cfg.exists() and refs:
            speaker_wav = refs if len(refs) > 1 else refs[0]
            return str(patient_dir), str(pth), str(cfg), speaker_wav

    if patient_id == "default":
        if (CHECKPOINTS_DIR / "best_model.pth").exists() and (CHECKPOINTS_DIR / "config.json").exists():
            spk = REPO_ROOT / "wavs" / "audio1.wav"
            return (
                str(CHECKPOINTS_DIR),
                str(CHECKPOINTS_DIR / "best_model.pth"),
                str(CHECKPOINTS_DIR / "config.json"),
                str(spk),
            )
        if RUN_TRAINING.exists():
            dirs = sorted(d for d in RUN_TRAINING.iterdir() if d.is_dir() and d.name.startswith("GPT_XTTS_"))
            if dirs:
                latest = dirs[-1]
                pth = latest / "best_model.pth"
                cfg = latest / "config.json"
                spk = REPO_ROOT / "wavs" / "audio1.wav"
                if pth.exists() and cfg.exists():
                    return str(latest), str(pth), str(cfg), str(spk)

    return None, None, None, None


def _list_available_patients():
    patients = []
    if CHECKPOINTS_DIR.is_dir():
        for d in sorted(CHECKPOINTS_DIR.iterdir()):
            if (
                d.is_dir()
                and (d / "best_model.pth").exists()
                and (d / "config.json").exists()
                and _get_speaker_refs(d)
            ):
                patients.append(d.name)
    if "default" not in patients:
        ckpt_dir, _, _, _ = _get_patient_checkpoint("default")
        if ckpt_dir:
            patients.insert(0, "default")
    return patients


# ---------------------------------------------------------------------------
# 모델 로드 / LRU 관리
# ---------------------------------------------------------------------------

def _load_model_for_patient(patient_id: str):
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
        while len(_model_registry) >= MAX_LOADED_MODELS:
            evict_id, evict_entry = _model_registry.popitem(last=False)
            del evict_entry["model"]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print(f" > 모델 언로드 (LRU): patient_id='{evict_id}'")
            _cache_clear_patient(evict_id)

        _model_registry[patient_id] = {
            "model": model, "config": config, "speaker_wav": speaker_wav,
        }

    print(f" > 모델 로드 완료: patient_id='{patient_id}'")


def _get_or_load(patient_id: str) -> dict:
    with _registry_lock:
        if patient_id in _model_registry:
            _model_registry.move_to_end(patient_id)
            return _model_registry[patient_id]
    _load_model_for_patient(patient_id)
    with _registry_lock:
        return _model_registry[patient_id]


# ---------------------------------------------------------------------------
# 음성 합성
# ---------------------------------------------------------------------------

def _synthesize_wav_bytes(text: str, patient_id: str) -> tuple[bytes, bool]:
    cached = _cache_get(patient_id, text)
    if cached is not None:
        return cached, True

    entry       = _get_or_load(patient_id)
    model       = entry["model"]
    config      = entry["config"]
    speaker_wav = entry["speaker_wav"]

    if not Path(speaker_wav).exists():
        raise HTTPException(status_code=500, detail=f"화자 참조 파일이 없습니다: {speaker_wav}")

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
    text:       str
    patient_id: str = "default"


class TrainRequest(BaseModel):
    epochs:     int = 50
    batch_size: int = 2


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
        "message": "TTS API", "docs": "/docs",
        "endpoints": {
            "tts":              "POST /tts",
            "patients":         "GET /patients",
            "register_voice":   "POST /patients/{patient_id}/voice",
            "get_patient":      "GET /patients/{patient_id}",
            "delete_patient":   "DELETE /patients/{patient_id}",
            "add_refs":         "POST /patients/{patient_id}/refs",
            "cache_stats":      "GET /cache/stats",
            "cache_clear":      "DELETE /cache",
            "train_start":      "POST /train/{patient_id}",
            "train_status":     "GET /train/{patient_id}/status",
            "train_cancel":     "DELETE /train/{patient_id}",
        },
    }


# ---------------------------------------------------------------------------
# 화자 음성 등록 API
# ---------------------------------------------------------------------------

def _validate_audio(file_bytes: bytes) -> float:
    """업로드된 오디오의 길이(초)를 검증하고 반환."""
    buf = io.BytesIO(file_bytes)
    try:
        info = torchaudio.info(buf)
    except Exception:
        raise HTTPException(status_code=400, detail="유효한 WAV 파일이 아닙니다.")
    duration = info.num_frames / info.sample_rate
    if duration < MIN_AUDIO_DURATION:
        raise HTTPException(status_code=400, detail=f"음성이 너무 짧습니다 ({duration:.1f}초). 최소 {MIN_AUDIO_DURATION}초 이상이어야 합니다.")
    if duration > MAX_AUDIO_DURATION:
        raise HTTPException(status_code=400, detail=f"음성이 너무 깁니다 ({duration:.1f}초). 최대 {MAX_AUDIO_DURATION}초 이하여야 합니다.")
    return duration


def _load_patient_profile(patient_id: str) -> dict:
    profile_path = CHECKPOINTS_DIR / patient_id / "profile.json"
    if profile_path.exists():
        return json.loads(profile_path.read_text(encoding="utf-8"))
    return {}


def _save_patient_profile(patient_id: str, profile: dict):
    profile_path = CHECKPOINTS_DIR / patient_id / "profile.json"
    profile_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")


@app.post("/patients/{patient_id}/voice")
async def register_voice(
    patient_id: str,
    name: str = Form("", description="환자 이름 (선택)"),
    files: List[UploadFile] = File(..., description="레퍼런스 음성 WAV 파일 (1~5개, 각 3~30초)"),
):
    """
    환자 음성을 등록합니다. 기존 체크포인트가 있으면 레퍼런스만 교체합니다.
    - patient_id: 환자 고유 ID
    - files: WAV 음성 파일 1~5개 (각 3~30초, 잡음 적은 깨끗한 음성 권장)
    """
    if len(files) > MAX_REFS_PER_SPEAKER:
        raise HTTPException(status_code=400, detail=f"레퍼런스는 최대 {MAX_REFS_PER_SPEAKER}개까지 가능합니다.")

    patient_dir = CHECKPOINTS_DIR / patient_id
    patient_dir.mkdir(parents=True, exist_ok=True)

    # 기존 ref 파일 제거
    for old_ref in patient_dir.glob("ref*.wav"):
        old_ref.unlink()

    saved_refs = []
    for i, f in enumerate(files, 1):
        content = await f.read()
        duration = _validate_audio(content)
        ref_path = patient_dir / f"ref{i}.wav"
        ref_path.write_bytes(content)
        saved_refs.append({"file": f"ref{i}.wav", "duration": round(duration, 1)})

    profile = {
        "patient_id": patient_id,
        "name": name,
        "registered_at": datetime.now().isoformat(),
        "refs": saved_refs,
        "has_model": (patient_dir / "best_model.pth").exists(),
    }
    _save_patient_profile(patient_id, profile)

    # 모델이 이미 로드되어 있으면 speaker_wav 갱신
    with _registry_lock:
        if patient_id in _model_registry:
            refs = _get_speaker_refs(patient_dir)
            _model_registry[patient_id]["speaker_wav"] = refs if len(refs) > 1 else refs[0]
    _cache_clear_patient(patient_id)

    return {"message": f"환자 '{patient_id}' 음성 등록 완료", "profile": profile}


@app.get("/patients")
def list_patients():
    available = _list_available_patients()
    with _registry_lock:
        loaded = list(_model_registry.keys())
    patients_info = []
    for pid in available:
        profile = _load_patient_profile(pid)
        patients_info.append({
            "patient_id": pid,
            "name": profile.get("name", ""),
            "ref_count": len(_get_speaker_refs(CHECKPOINTS_DIR / pid)),
            "has_model": (CHECKPOINTS_DIR / pid / "best_model.pth").exists(),
            "loaded": pid in loaded,
        })
    return {"patients": patients_info, "total": len(available), "max_loaded": MAX_LOADED_MODELS}


@app.get("/patients/{patient_id}")
def get_patient(patient_id: str):
    """환자 상세 정보를 반환합니다."""
    patient_dir = CHECKPOINTS_DIR / patient_id
    if not patient_dir.exists():
        raise HTTPException(status_code=404, detail=f"등록되지 않은 환자입니다: {patient_id}")
    profile = _load_patient_profile(patient_id)
    profile["refs"] = [r.name for r in sorted(patient_dir.glob("ref*.wav"))]
    profile["has_model"] = (patient_dir / "best_model.pth").exists()
    with _registry_lock:
        profile["loaded"] = patient_id in _model_registry
    return profile


@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: str):
    """환자 데이터(레퍼런스 + 모델)를 삭제합니다."""
    patient_dir = CHECKPOINTS_DIR / patient_id
    if not patient_dir.exists():
        raise HTTPException(status_code=404, detail=f"등록되지 않은 환자입니다: {patient_id}")
    # 모델 언로드
    with _registry_lock:
        if patient_id in _model_registry:
            del _model_registry[patient_id]["model"]
            del _model_registry[patient_id]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
    _cache_clear_patient(patient_id)
    shutil.rmtree(patient_dir)
    return {"message": f"환자 '{patient_id}' 삭제 완료"}


@app.post("/patients/{patient_id}/refs")
async def add_patient_refs(
    patient_id: str,
    files: List[UploadFile] = File(..., description="추가할 레퍼런스 음성 WAV 파일"),
):
    """기존 환자에 레퍼런스 음성을 추가합니다."""
    patient_dir = CHECKPOINTS_DIR / patient_id
    if not patient_dir.exists():
        raise HTTPException(status_code=404, detail=f"등록되지 않은 환자입니다: {patient_id}")

    existing_refs = list(patient_dir.glob("ref*.wav"))
    if len(existing_refs) + len(files) > MAX_REFS_PER_SPEAKER:
        raise HTTPException(
            status_code=400,
            detail=f"레퍼런스 최대 {MAX_REFS_PER_SPEAKER}개. 현재 {len(existing_refs)}개, {MAX_REFS_PER_SPEAKER - len(existing_refs)}개 추가 가능.",
        )

    new_refs = []
    for i, f in enumerate(files, len(existing_refs) + 1):
        content = await f.read()
        duration = _validate_audio(content)
        ref_path = patient_dir / f"ref{i}.wav"
        ref_path.write_bytes(content)
        new_refs.append({"file": f"ref{i}.wav", "duration": round(duration, 1)})

    # 프로필 업데이트
    profile = _load_patient_profile(patient_id)
    profile.setdefault("refs", []).extend(new_refs)
    _save_patient_profile(patient_id, profile)

    # 로드된 모델의 speaker_wav 갱신
    with _registry_lock:
        if patient_id in _model_registry:
            refs = _get_speaker_refs(patient_dir)
            _model_registry[patient_id]["speaker_wav"] = refs if len(refs) > 1 else refs[0]
    _cache_clear_patient(patient_id)

    return {"message": f"{len(new_refs)}개 레퍼런스 추가 완료", "total_refs": len(existing_refs) + len(new_refs)}


@app.post("/tts")
def tts(request: TTSRequest, format: str = "wav"):
    """
    텍스트를 음성으로 변환합니다.
    - patient_id: 환자 식별자 (기본값: "default")
    - format=wav  : wav 파일 반환 (X-Cache: HIT/MISS 헤더 포함)
    - format=base64: JSON { audio_base64, sample_rate, patient_id, cached }
    """
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text 필드가 비어 있습니다.")

    wav_bytes, from_cache = _synthesize_wav_bytes(text, request.patient_id)

    if format == "base64":
        return JSONResponse(content={
            "audio_base64": base64.b64encode(wav_bytes).decode("ascii"),
            "sample_rate":  OUTPUT_SAMPLE_RATE,
            "patient_id":   request.patient_id,
            "cached":       from_cache,
        })

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "inline; filename=tts.wav",
            "Content-Length":      str(len(wav_bytes)),
            "X-Cache":             "HIT" if from_cache else "MISS",
        },
    )


# --- 캐시 ---

@app.get("/cache/stats")
def cache_stats():
    with _cache_lock:
        size        = len(_tts_cache)
        total_bytes = sum(len(v) for v in _tts_cache.values())
    total    = _cache_hits + _cache_misses
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
    with _cache_lock:
        count = len(_tts_cache)
        _tts_cache.clear()
        _cache_hits = _cache_misses = 0
    return {"deleted": "all", "count": count}


# --- 비동기 학습 ---

@app.post("/train/{patient_id}")
def start_training(patient_id: str, request: TrainRequest = TrainRequest()):
    """
    환자 모델 학습을 백그라운드에서 시작합니다.
    - 학습 데이터: data/{patient_id}/wavs_new/ (metadata.txt + wav 파일)
    - 학습 완료 시 best_model.pth → checkpoints/{patient_id}/ 자동 배포
    - 같은 환자의 학습이 이미 실행 중이면 409 반환
    """
    with _train_lock:
        job = _train_jobs.get(patient_id)
        if job and job.status == "running":
            raise HTTPException(status_code=409, detail=f"환자 '{patient_id}' 학습이 이미 실행 중입니다.")

    if not TRAIN_SCRIPT.exists():
        raise HTTPException(status_code=500, detail=f"학습 스크립트를 찾을 수 없습니다: {TRAIN_SCRIPT}")

    data_dir = REPO_ROOT / "data" / patient_id / "wavs_new"
    if not data_dir.exists():
        raise HTTPException(
            status_code=422,
            detail=f"학습 데이터가 없습니다: {data_dir}\nbuild_dataset.py 실행 후 시도하세요.",
        )

    log_dir  = REPO_ROOT / "run" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"train_{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    with open(log_path, "w", encoding="utf-8") as log_f:
        process = subprocess.Popen(
            [
                "python", str(TRAIN_SCRIPT),
                "--patient_id", patient_id,
                "--epochs",     str(request.epochs),
                "--batch_size", str(request.batch_size),
            ],
            stdout=log_f,
            stderr=subprocess.STDOUT,
            cwd=str(REPO_ROOT),
        )

    with _train_lock:
        _train_jobs[patient_id] = _TrainJob(
            process=process, status="running",
            started_at=datetime.now(), log_path=log_path,
            patient_id=patient_id, epochs=request.epochs,
            batch_size=request.batch_size,
        )

    print(f" > 학습 시작: patient_id='{patient_id}' pid={process.pid} epochs={request.epochs}")
    return {
        "patient_id": patient_id,
        "status":     "started",
        "pid":        process.pid,
        "log_path":   str(log_path),
    }


@app.get("/train/{patient_id}/status")
def get_training_status(patient_id: str, log_lines: int = 20):
    """
    학습 상태 및 최근 로그 반환.
    - status: idle | running | completed | failed | cancelled
    - log_lines: 반환할 최근 로그 줄 수 (기본값: 20)
    """
    job = _poll_job(patient_id)
    if job is None:
        return {"patient_id": patient_id, "status": "idle"}

    elapsed = int((datetime.now() - job.started_at).total_seconds())
    recent_logs = []
    if job.log_path.exists():
        with open(job.log_path, "r", encoding="utf-8", errors="replace") as f:
            recent_logs = [line.rstrip() for line in f.readlines()[-log_lines:]]

    return {
        "patient_id":      patient_id,
        "status":          job.status,
        "started_at":      job.started_at.isoformat(),
        "elapsed_seconds": elapsed,
        "epochs":          job.epochs,
        "pid":             job.process.pid,
        "returncode":      job.process.returncode,
        "recent_logs":     recent_logs,
    }


@app.delete("/train/{patient_id}")
def cancel_training(patient_id: str):
    """실행 중인 학습을 강제 종료합니다."""
    with _train_lock:
        job = _train_jobs.get(patient_id)
        if job is None or job.status != "running":
            raise HTTPException(status_code=404, detail=f"환자 '{patient_id}'의 실행 중인 학습이 없습니다.")
        job.process.terminate()
        job.status = "cancelled"

    print(f" > 학습 취소: patient_id='{patient_id}'")
    return {"patient_id": patient_id, "status": "cancelled"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
