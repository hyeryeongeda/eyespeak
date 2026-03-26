FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ONNX 모델 파일 먼저 복사 (캐시 레이어 활용)
COPY onnx_model_quantized/ ./onnx_model_quantized/

COPY . .

EXPOSE 5003

CMD ["python", "caregiver_server_db.py"]
