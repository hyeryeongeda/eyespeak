# =============================================================================
# Frontend Development Dockerfile (Vite 개발 서버)
# =============================================================================
# Dev/Local 환경에서 사용. 코드 변경 시 즉시 반영 (HMR)
# Prod 환경에서는 Dockerfile.prod 사용
# =============================================================================

FROM node:22-alpine
WORKDIR /app

# 의존성 먼저 설치 (캐시 최적화)
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 코드 복사
COPY . .

# Vite 개발 서버 포트
EXPOSE 5173

# Vite 개발 서버 실행 (--host로 외부 접근 허용)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
