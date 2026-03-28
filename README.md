# EyeSpeak(아이스피크)

> 시선 추적 기반 환자-보호자 의사소통 보조 서비스

루게릭병(ALS) 환자를 위한 시선 기반 AI 의사소통 플랫폼

---

## 목차

1. [기술 스택](#기술-스택)
2. [아키텍처](#아키텍처)
3. [서비스 URL](#서비스-url)
4. [프로젝트 구조](#프로젝트-구조)
5. [문서](#문서)
6. [팀원](#팀원)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 백엔드 | Spring Boot 3.5, Java 21, JPA, Spring Security (JWT) |
| 프론트엔드 | React 19, TypeScript, Vite 7, Tailwind CSS, Zustand |
| 모바일 | Capacitor 8 (Android) |
| DB | MySQL 8.0, Redis 7 |
| AI - TTS | XTTS v2, FastAPI, PyTorch (GPU) |
| AI - 추천 | Flask, OpenAI API, ONNX Runtime |
| AI - 시선추적 | Flask, MediaPipe, OpenCV |
| 인프라 | Docker, Jenkins, Nginx, RunPod GPU |
| 배포 | Blue/Green 무중단 배포 |

---

## 아키텍처

```
사용자 (브라우저/앱)
    ↓ HTTPS
EC2 서버
├── Nginx (리버스 프록시 + SSL)
├── 프론트엔드 (React/Vite)     :5173
├── 백엔드 (Spring Boot)        :8080          -> AWS S3
├── MySQL                       :3306
├── Redis                       :6379
├── Eye Tracking (Flask)        :5000
├── Jenkins (CI/CD)             :8080
└── GitLab Runner
    ↓ HTTPS
RunPod GPU 서버 (RTX 4000 Ada)
├── TTS 서버 (XTTS v2)         :8000
├── Dev 추천 서버 (Flask)       :5003
└── Prod 추천 서버 (Flask)      :5004
    ↓
OpenAI API
```

---

## 서비스 URL

| 환경 | 프론트엔드 | 백엔드 API |
|------|-----------|-----------|
| Dev | https://j14e205.p.ssafy.io/dev | https://j14e205.p.ssafy.io/dev/api/v1 |
| Prod | https://j14e205.p.ssafy.io | https://j14e205.p.ssafy.io/api/v1 |

---

## 프로젝트 구조

```
S14P21E205/
├── backend/                    # Spring Boot 백엔드
│   ├── src/main/java/e205/eyespeak/
│   │   ├── domain/             # 도메인별 패키지 (auth, chat, call, tts 등)
│   │   └── global/             # 공통 (config, error, jwt, websocket)
│   ├── src/main/resources/     # 설정 파일 (application*.yml)
│   ├── Dockerfile
│   └── build.gradle
│
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── app/                # 라우터, 레이아웃
│   │   ├── features/           # 기능별 컴포넌트 (patient, care)
│   │   ├── pages/              # 페이지 컴포넌트
│   │   ├── services/           # API 클라이언트
│   │   └── stores/             # Zustand 상태 관리
│   ├── Dockerfile / Dockerfile.prod
│   └── package.json
│
├── ai-tts/                     # TTS 음성 합성 서버 (FastAPI)
├── ai-recommend/               # AI 추천 서버 (Flask)
├── ai-eyetracking/             # 시선 추적 서버 (Flask)
│
├── infra/                      # 인프라 설정
│   ├── docker-compose*.yml     # Docker Compose 파일들
│   ├── nginx-proxy/nginx.conf  # Nginx 설정
│   └── .env.ai                 # AI 서버 환경변수
│
├── scripts/                    # 배포 스크립트
├── Jenkinsfile                 # CI/CD 파이프라인
├── Makefile                    # 배포 명령어 통합
└── exec/                       # 산출물 (포팅 매뉴얼 등)
```

---

## 문서

| 문서 | 설명 |
|------|------|
| [포팅 매뉴얼](exec/포팅_매뉴얼.md) | 빌드/배포/환경변수/DB 접속 정보 |

---

## 팀원

SSAFY 14기 부울경 2반 E205팀

| 팀원  | 역할              |
|-----|-----------------|
| 김예린 | AI, Backend     |
| 김하은 | AI              |
| 김혜령 | Frontend        |
| 박윤환 | AI              |
| 박준수 | Backend         |
| 오언서 | Backend, DevOps |
| 진채영 | Frontend        |

