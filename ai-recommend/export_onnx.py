"""
export_onnx.py - SentenceTransformer → ONNX + INT8 양자화 변환 스크립트

사용법:
  pip install sentence-transformers onnx onnxruntime optimum
  python export_onnx.py

결과:
  onnx_model/model.onnx           (FP32 원본)
  onnx_model_quantized/model.onnx (INT8 양자화 — 실서버용)
  onnx_model_quantized/tokenizer* (토크나이저 파일)
"""
import os
import shutil
import numpy as np
from pathlib import Path

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
OUTPUT_DIR = Path("onnx_model")
QUANTIZED_DIR = Path("onnx_model_quantized")


def main():
    # 1) SentenceTransformer 로드 + ONNX export
    print("[1/3] 모델 로드 + ONNX 변환 중...")
    from optimum.onnxruntime import ORTModelForFeatureExtraction
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = ORTModelForFeatureExtraction.from_pretrained(MODEL_NAME, export=True)
    model.save_pretrained(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    print(f"  → {OUTPUT_DIR}/model.onnx 생성 완료")

    # 2) INT8 양자화
    print("[2/3] INT8 양자화 중...")
    from optimum.onnxruntime import ORTQuantizer
    from optimum.onnxruntime.configuration import AutoQuantizationConfig

    quantizer = ORTQuantizer.from_pretrained(str(OUTPUT_DIR))
    qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)
    quantizer.quantize(save_dir=str(QUANTIZED_DIR), quantization_config=qconfig)
    # 토크나이저도 복사
    tokenizer.save_pretrained(str(QUANTIZED_DIR))
    print(f"  → {QUANTIZED_DIR}/model_quantized.onnx 생성 완료")

    # 3) 검증
    print("[3/3] 품질 검증 중...")
    _verify(tokenizer)
    print("\n변환 완료!")


def _verify(tokenizer):
    """FP32 vs INT8 코사인 유사도 비교"""
    import onnxruntime as ort

    test_texts = [
        "왼쪽 어깨가 아파",
        "예승이 보고 싶어",
        "롯데 이겼어?",
        "오렌지 주스 줘",
        "나훈아 노래 틀어줘",
    ]

    def encode_onnx(session, tokenizer, texts):
        inputs = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="np")
        outputs = session.run(None, {k: v for k, v in inputs.items() if k in [i.name for i in session.get_inputs()]})
        # mean pooling
        token_embeddings = outputs[0]
        attention_mask = inputs["attention_mask"]
        mask_expanded = np.expand_dims(attention_mask, -1).astype(np.float32)
        summed = np.sum(token_embeddings * mask_expanded, axis=1)
        counts = np.clip(mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
        return summed / counts

    # FP32
    fp32_session = ort.InferenceSession(str(OUTPUT_DIR / "model.onnx"))
    fp32_vecs = encode_onnx(fp32_session, tokenizer, test_texts)

    # INT8
    q_model_path = QUANTIZED_DIR / "model_quantized.onnx"
    if not q_model_path.exists():
        q_model_path = QUANTIZED_DIR / "model.onnx"
    int8_session = ort.InferenceSession(str(q_model_path))
    int8_vecs = encode_onnx(int8_session, tokenizer, test_texts)

    print("\n  FP32 vs INT8 코사인 유사도:")
    for i, text in enumerate(test_texts):
        cos = np.dot(fp32_vecs[i], int8_vecs[i]) / (np.linalg.norm(fp32_vecs[i]) * np.linalg.norm(int8_vecs[i]))
        print(f"    {text}: {cos:.6f}")


if __name__ == "__main__":
    main()
