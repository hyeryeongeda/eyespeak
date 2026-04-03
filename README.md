<div align="center">

# 👀 eyespeak(아이스피크)

**눈으로 마음을 전하다, eyeSpeak**

<img src="./readme-assets/eyespeak-logo.png" width="50%"/>


- **루게릭병(ALS) 환자를 위한 시선 기반 AI 의사소통 플랫폼** <br>
- **시선 추적 기반 환자-보호자 의사소통 보조 서비스**

- **개발 기간** : 2026.02.16 ~ 2025.04.03 **(7주)**
- **플랫폼** : 인공지능(영상)
- **개발 인원** : 7명 
- **주관** : 삼성 청년 SW·AI 아카데미 14기<br><br>

</div> <br>

## 🔎 목차

<div align="center">

### <a href="#developers">🌟 팀원 구성</a>

### <a href="#techStack">🛠️ 기술 스택</a>

### <a href="#systemArchitecture">🌐 시스템 아키텍처</a>

### <a href="#skills">📲 기능 구성</a>

### <a href="#feature"> 🏛️ 기능 시연</a>

### <a href="#directories">📂 디렉터리 구조</a>

### <a href="#projectDeliverables">📦 프로젝트 산출물</a>

</div>
<br>

## 🌟 팀원 구성

<a name="developers"></a>

<div align="center">

<table width="100%">
    <tr>
        <td width="33%" align="center"> 
            <a href="https://github.com/chaezerojj">
                <img src="./readme-assets/chaeyoung.jpg" width="160px" height="200px" style="object-fit: cover;" />
            </a>
            <hr> <a href="https://github.com/chaezerojj">
                <b>진채영</b><br>(Leader & Frontend) 
            </a> 
        </td>
        <td width="33%" align="center"> 
            <a href="https://github.com/brightonlog1">
                <img src="./readme-assets/yerin.jpg" width="160px" height="200px" style="object-fit: cover;" />
            </a>
            <hr> <a href="https://github.com/brightonlog1">
                <b>김예린</b><br>(Backend & AI) 
            </a> 
        </td>
        <td width="33%" align="center"> 
            <a href="https://github.com/naneunhaeun">
                <img src="./readme-assets/haeun.png" width="160px" height="200px" style="object-fit: cover;" />
            </a>
            <hr> <a href="https://github.com/naneunhaeun">
                <b>김하은</b><br>(AI) 
            </a> 
        </td>
    </tr>
    <tr>
        <td width="33%" valign="top">
            <sub>
                - 프로젝트 총괄 및 보호자모드 프론트엔드 전체 설계·구현<br>
                - WebSocket STOMP 기반 실시간 채팅 공통 레이어 설계 및 구현<br>
                - FCM 푸시 알림 시스템 구현 (포그라운드/백그라운드, 인앱 알림 UI)<br>
                - Capacitor 기반 Android 앱 빌드 및 네이티브 호환성 처리<br>
            </sub>
        </td>
        <td width="33%" valign="top">
            <sub>
                - 임베딩 검색 + LLM 기반 보호자 메시지 맞춤형 추천 답변 시스템 설계·구현<br>
                - ONNX INT8 양자화 적용을 통한 임베딩 모델 경량화 및 추론 속도 6.5배 개선<br>
                - 신규 환자 Cold start 대비 범용 말뭉치 자동 전환 및 개인화 로직 구현<br>
                - JWT 인증 및 AI 추천 서버 연동 REST API 설계·구현<br>
            </sub>
        </td>
        <td width="33%" valign="top">
            <sub>
                - XTTS v2 기반 보호자 음성 클로닝을 통한 개인화 TTS 음성 합성 서버 구축<br>
                - 환자별 참조 음성 등록 및 LRU 캐싱 적용 실시간 음성 합성 API 설계<br>
                - 음성 길이 검증 및 추론 파라미터 최적화를 통한 TTS 품질·안정성 확보<br>
                - React Three Fiber 기반 신체 3D 모델 렌더링 및 통증 부위 시각화 구현<br>
            </sub>
        </td>
    </tr>
</table>

<br>

<table width="100%">
    <tr>
        <td width="25%" align="center"> 
            <a href="https://github.com/hyeryeongeda">
                <img src="./readme-assets/hyeryeong.jpg" width="160px" height="200px" style="object-fit: cover;" />
            </a>
            <hr> <a href="https://github.com/hyeryeongeda">
                <b>김혜령</b><br>(Frontend) 
            </a> 
        </td>
        <td width="25%" align="center"> 
            <a href="https://github.com/JPW-star">
                <img src="./readme-assets/junsu.jpg" width="160px" height="200px" style="object-fit: cover;" />
            </a>
            <hr> <a href="https://github.com/JPW-star">
                <b>박준수</b><br>(Backend) 
            </a> 
        </td>
        <td width="25%" align="center"> 
            <a href="https://github.com/YHPARK-KR">
                <img src="./readme-assets/yunhwan.jpg" width="160px" height="200px" style="object-fit: cover;" />
            </a>
            <hr> <a href="https://github.com/YHPARK-KR">
                <b>박윤환</b><br>(AI) 
            </a> 
        </td>
        <td width="25%" align="center"> 
            <a href="https://github.com/eonseo">
                <img src="./readme-assets/eonseo.jpg" width="160px" height="200px" style="object-fit: cover;" />
            </a>
            <hr> <a href="https://github.com/eonseo">
                <b>오언서</b><br>(Backend & Infra) 
            </a> 
        </td>
    </tr>
    <tr>
        <td width="25%" valign="top">
            <sub>
                - 환자·보호자 역할 기반 인증 및 회원가입·세션 유지 흐름 구현<br>
                - 환자모드 시선 추적 기반 입력 UX 및 공통 인터랙션 구조 구축<br>
                - AI 추천 답변·맞춤 대화·한글 직접입력 등 환자 커뮤니케이션 플로우 구현<br>
                - 여가, 즐겨찾기, 몸과 마음 표현 화면 및 인터럽트 복귀 UX 설계·구현<br>
            </sub>
        </td>
        <td width="25%" valign="top">
            <sub>
                - WebSocket STOMP 기반 실시간 채팅 시스템 설계 및 구현<br>
                - Firebase Admin SDK 연동 FCM 푸시 알림 구현<br>
                - 보호자·환자 도메인 REST API 및 AI 서버 연동 내부 API 구현<br>
                - Spring Security 필터 체인(JWT, AI API Key) 구성 및 CORS·Swagger 설정<br>
            </sub>
        </td>
        <td width="25%" valign="top">
            <sub>
                - MediaPipe FaceLandmarker 기반 홍채 좌표·EAR 추출 실시간 시선 추적 설계<br>
                - 다항식 캘리브레이션 및 온라인 학습(Ridge 회귀) 보정 로직 개발<br>
                - One-Euro 필터 축 분리 적용을 통한 시선 좌표 안정화<br>
                - Dwell 기반 선택 정책 및 눈 깜빡임 트리거 검출 로직 구현<br>
            </sub>
        </td>
        <td width="25%" valign="top">
            <sub>
                - EC2 Dev/Prod 환경 분리 및 Blue/Green 무중단 배포 구축·운영<br>
                - Jenkins CI/CD 파이프라인 및 자동 롤백 체계 구현<br>
                - RunPod GPU 클라우드 연동 TTS·AI 추천 인프라 설계, S3 음성 저장 연동<br>
                - 환자모드 대화 API 개발 (카테고리 트리 / 사용 로그 / TTS 음성 합성)<br>
            </sub>
        </td>
    </tr>
</table>

</div>
<br>

</div>
## 🛠️ 기술 스택

<a name="techStack"></a>

### 🌕 Frontend

<div align="center">

<img src="https://img.shields.io/badge/VisualStudioCode-007ACC?style=for-the-badge&logo=VisualStudioCode&logoColor=white">
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
<img src="https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white">
<img src="https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white">
<br>
<img src="https://img.shields.io/badge/react-61DAFB?style=for-the-badge&logo=react&logoColor=white">
<img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white">
<img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white">
<img src="https://img.shields.io/badge/Zustand-orange?style=for-the-badge&logo=Rss&logoColor=white">
<br>
<img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=Three.js&logoColor=white">
<img src="https://img.shields.io/badge/React%20Three%20Fiber-000000?style=for-the-badge&logo=react&logoColor=white">
<img src="https://img.shields.io/badge/Blender-E87D0D?style=for-the-badge&logo=Blender&logoColor=white">

<br>

|  **Category**  | **Stack**                                                             |
| :------------: | :-------------------------------------------------------------------- |
|  **Language**  | TypeScript 5.8.3                                                      |
| **Framework**  | React 19.1.0, React Router 7.7.0                                      |
|  **Library**   | Zustand 5.0.6, Axios 1.10.0, React Three Fiber, Drei, Emotion 11.14.0 |
| **Build Tool** | Vite 6.3.1                                                            |
|    **IDE**     | Visual Studio Code 1.103.1                                            |

</div>

### 🌑 Backend

<div align="center">

<img src="https://img.shields.io/badge/IntelliJ_IDEA-black?style=for-the-badge&logo=intellijidea">
<img src="https://img.shields.io/badge/Java-orange?style=for-the-badge&logo=openjdk">
<img src="https://img.shields.io/badge/Gradle-02303A?style=for-the-badge&logo=gradle">
<br>
<img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot">
<img src="https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity">
<img src="https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=jsonwebtokens">
<br>
<img src="https://img.shields.io/badge/Hibernate-59666C?style=for-the-badge&logo=hibernate">
<img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql">
<img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis">
<br>
<img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger">
<img src="https://img.shields.io/badge/OpenAI-black?style=for-the-badge&logo=openai">

<br>

|  **Category**  | **Stack**                                                                                                                             |
| :------------: | :------------------------------------------------------------------------------------------------------------------------------------ |
|  **Language**  | Java 17                                                                                                                               |
| **Framework**  | Spring Boot 3.5.9                                                                                                                     |
|  **Library**   | Spring Security, Spring Data JPA, Spring Data Redis, <br> Spring Batch, Spring Validation, Springdoc OpenAPI, <br> JWT (jjwt), Lombok |
| **Build Tool** | Gradle 8.14.3                                                                                                                         |
|  **Database**  | MySQL 8.0, Redis 7.4                                                                                                                  |
|    **IDE**     | IntelliJ IDEA 2023.3.8 (Ultimate Edition)                                                                                             |

</div>

### 🤖 AI

<div align="center">

<img src="https://img.shields.io/badge/VisualStudioCode-007ACC?style=for-the-badge&logo=VisualStudioCode&logoColor=white">
<img src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54">
<br>
<img src="https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white">
<img src="https://img.shields.io/badge/numpy-%23013243.svg?style=for-the-badge&logo=numpy&logoColor=white">
<br>
<img src="https://img.shields.io/badge/BentoML-FF6F00?style=for-the-badge&logo=bentoml&logoColor=white">
<img src="https://img.shields.io/badge/ChromaDB-orange?style=for-the-badge&logo=database&logoColor=white">
<img src="https://img.shields.io/badge/RunPod-purple?style=for-the-badge&logo=serverless&logoColor=white">

<br>

|  **Category**  | **Stack**                                     |
| :------------: | :-------------------------------------------- |
|  **Language**  | Python 3.9+                                   |
| **Framework**  | BentoML                                       |
|  **Library**   | PyTorch, NumPy, Pandas, ChromaDB, OpenAI CLIP |
|   **Model**    | SASRec, Two-Tower Recommender                 |
|  **Database**  | ChromaDB (Vector Store)                       |
| **Deployment** | RunPod GPU Pod, Docker                        |
|    **IDE**     | Visual Studio Code                            |

</div>

### ⚙️ DevOps

<div align="center">

<img src="https://img.shields.io/badge/GitLab-FC6D26?style=for-the-badge&logo=gitlab&logoColor=white">
<img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white">
<img src="https://img.shields.io/badge/Jenkins-D24939?style=for-the-badge&logo=jenkins&logoColor=white">
<br>
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white">
<img src="https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white">
<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white">
<br>
<img src="https://img.shields.io/badge/SSH-4D4D4D?style=for-the-badge&logo=openssh&logoColor=white">
<img src="https://img.shields.io/badge/Ubuntu-E95420?style=for-the-badge&logo=ubuntu&logoColor=white">
<img src="https://img.shields.io/badge/Mattermost-0058CC?style=for-the-badge&logo=mattermost&logoColor=white">

<br>

#### 서버 스펙

|      **요소**      |  **스펙**   |
| :----------------: | :---------: |
|      **CPU**       |   4vCPUs    |
|      **RAM**       |    16 GB    |
| **Storage (Disk)** | SSD: 320 GB |

<br>

#### 사용 기술

|      **기술**      |   **버전**    |
| :----------------: | :-----------: |
|    **Jenkins**     |    2.528.3    |
|     **Docker**     |    29.1.5     |
| **Docker Compose** |     5.0.1     |
|     **Nginx**      | 1.29.4-alpine |
|   **Mattermost**   |    10.11.9    |

</div>

## 🌐 시스템 아키텍처

<a name="systemArchitecture"></a>

### 🏗️ System Architecture

<img src="./readme-assets/system_architecture.png"/>

### ⚙️ CI/CD Sequence Diagram

<img src="./readme-assets/cicd_architecture.png"/>

### 🔔 Event Notification

<div align="center">

<table>
  <tr>
    <td align="center" width="50%"><b>❌ Jenkins Pipeline Failure</b></td>
    <td align="center" width="50%"><b>✅ Jenkins Pipeline Success</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/jenkins_pipeline_fail.png"/></td>
    <td align="center"><img src="./readme-assets/jenkins_pipeline_success.png"/></td>
  </tr>
</table>

</div>

<br>

## 📲 기능 구성

<a name="skills"></a>

### 🎨 주요 기능

#### 1️⃣ 사용자 인증 및 권한 관리

- **회원가입/로그인**: 이메일 인증 기반 회원가입, JWT 토큰 기반 인증
- **역할 구분**: 환자모드 / 보호자모드 권한 분리

## 🏛️ 기능 시연

<a name="feature"></a>

### 🖥️ 화면 구성 및 기능

<div align="center">

<table>
  <tr>
    <td align="center" width="33%"><b>1. </b></td>
    <td align="center" width="33%"><b>2. </b></td>
    <td align="center" width="33%"><b>3. </b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/1"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/2"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/3"/></td>
  </tr>

</table>

</div>

### 🖥️ 실제 기능 시연

<div>

<table>
  <tr>
    <td align="center" width="33%"><b>1. </b></td>
    <td align="center" width="33%"><b>2. </b></td>
    <td align="center" width="33%"><b>3. </b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
  </tr>
    <tr>
    <td align="center" width="33%"><b>4. </b></td>
    <td align="center" width="33%"><b>5. </b></td>
    <td align="center" width="33%"><b>6. </b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
  </tr>
    <tr>
    <td align="center" width="33%"><b>7. </b></td>
    <td align="center" width="33%"><b>8. </b></td>
    <td align="center" width="33%"><b>9. </b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/"/></td>
  </tr>
</table>

</div>

### 🎨 화면 구성 및 기능

## 📂 디렉터리 구조

<a name="directories"></a>

### 🌕 Frontend

<details align="left">
  <summary>
    <strong>Frontend 프로젝트 구조</strong>
  </summary>

```
📦frontend/src
 ├── app/               # 앱 진입점, 레이아웃, 라우터
 ├── assets/            # 정적 리소스 (사운드 등)
 ├── components/        # 공통 컴포넌트 (알림, 환자 채팅, TTS)
 ├── config/            # 환경 설정
 ├── constants/         # 상수 정의
 ├── features/          # 기능 모듈
 │   ├── auth/          #   인증
 │   ├── care/          #   보호자모드 (채팅, 컨텍스트, 타입)
 │   └── patient/       #   환자모드 (대화, 몸과마음, 입력, 감정)
 ├── hooks/             # 커스텀 훅
 ├── pages/             # 페이지 컴포넌트
 │   ├── auth/          #   로그인·회원가입
 │   ├── care/          #   보호자 홈·설정
 │   └── patient/       #   환자 메인·대화·여가·즐겨찾기·몸과마음
 ├── services/          # API·WebSocket·캘리브레이션
 ├── shared/            # 공유 상태 (stores)
 ├── stores/            # 전역 상태 관리
 ├── types/             # 공통 타입 정의
 └── utils/             # 유틸리티 함수
```

</details>

### 🌑 Backend

<details align="left">
  <summary>
    <strong>Backend 프로젝트 구조</strong>
  </summary>

```
📦backend/src/main/java/e205/eyespeak
 ├── domain/
 │   ├── ai/              # AI 추천 연동
 │   ├── auth/            # 인증·인가
 │   ├── call/            # 호출(SOS) 관리
 │   ├── category/        # 카테고리 트리
 │   ├── chat/            # 채팅 (WebSocket)
 │   ├── communication/   # 소통 기록
 │   ├── fcm/             # FCM 푸시 알림
 │   ├── guardian/        # 보호자 관리
 │   ├── leisure/         # 여가 콘텐츠
 │   ├── log/             # 사용 로그
 │   ├── matching/        # 환자-보호자 매칭
 │   ├── patient/         # 환자 관리
 │   ├── recommendation/  # 추천 표현
 │   ├── record/          # 대화 기록
 │   ├── routine/         # 루틴 관리
 │   ├── setting/         # 설정 (Dwell Time 등)
 │   ├── tts/             # TTS 음성 합성
 │   └── user/            # 사용자 공통
 └── global/
     ├── common/          # 공통 응답·유틸
     ├── config/          # Spring 설정
     ├── enums/           # 공통 열거형
     ├── error/           # 예외 처리
     ├── jwt/             # JWT 인증
     ├── util/            # 유틸리티
     └── websocket/       # WebSocket 설정
```

</details>

### 🤖 AI

<details align="left">
  <summary>
    <strong>AI 프로젝트 구조</strong>
  </summary>

```
📦ai-eyetracking/
 ├── eye_speak/
 │   ├── configs/         # 설정 파일
 │   ├── iris_model/      # 홍채 인식 모델
 │   ├── iris_tracker/    # 홍채 추적기
 │   └── pipeline/        # 시선 추적 파이프라인
 └── scripts/             # 실행 스크립트

📦ai-recommend/
 ├── caregiver_server_db.py   # 추천 서버
 ├── export_onnx.py           # ONNX 모델 변환
 └── metrics.py               # 평가 지표

📦ai-tts/
 ├── tts_server.py            # TTS 서버
 ├── pipeline.py              # 음성 합성 파이프라인
 ├── config.py                # TTS 설정
 └── train_gpt_xtts.py        # XTTS 학습
```

</details>

## 📦 프로젝트 산출물

<a name="projectDeliverables"></a>

<h3>🖼️ 화면 설계서</h3>

<details>
  <summary><strong>화면 설계서</strong></summary>
  <br>
  <div align="left">
    <img src="./readme-assets/eyespeak-erd.webp" width="100%" />
  </div>
</details>

<h3>🗄️ ERD</h3>
<div align="center">

<img src="./readme-assets/eyespeak-erd.png" width="100%" />
</div>

<h3><a href="https://www.notion.so/305c8be1c65c80f89902ef12c97e4d43?source=copy_link" target="_blank">📋 요구 사항 명세서</a></h3>

<h3><a href="https://www.notion.so/32ec8be1c65c8098a55bc649b2e75e0d?v=32ec8be1c65c810fa34a000c33a6fe52&source=copy_link" target="_blank">📡 API 명세서</a></h3>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 22.17.0+
- **Java** 17
- **Python** 3.9+
- **Docker** 최신 버전
- **MySQL** 8.0
- **Redis** 7.4

### Installation & Running

#### 1️⃣ Frontend

```bash
cd frontend
npm install
npm run dev
```

#### 2️⃣ Backend

#### 3️⃣ AI Server

### Environment Variables

#### Frontend (.env)

#### Backend (application.yml)

#### AI (.env)

---

## 📝 주요 기술적 특징

### 🔐 보안

- JWT 기반 인증/권한 시스템
- Spring Security를 통한 API 보안
- CORS 정책 적용

### 🚀 성능 최적화

-

### 🤖 AI/ML

-

### 🎨 3D 경험

- React Three Fiber 기반
- Blender GLB 에셋 최적화

### 📦 CI/CD

- Jenkins 기반 자동 배포
- Docker 컨테이너화
- Nginx 리버스 프록시

---

### 🏃 Jira Issues

<div align="center">

<img src="./readme-assets/e205-jira-sprints.png" width="100%" />
</div>

---

**© 2026 eyespeak. All rights reserved.**

</div>
