# EyeSpeak 프로젝트 컨텍스트

Claude Code가 이 파일을 자동으로 읽어 프로젝트 맥락을 유지합니다.

---

## 1. 프로젝트 개요

- **프로젝트명**: EyeSpeak
- **설명**: 환자(시선 입력)와 보호자 간 의사소통 보조 앱
- **백엔드**: Spring Boot / Java
- **DB**: MySQL
- **인증**: JWT (Access Token - Body, Refresh Token - Body)

---

## 2. 환경별 도메인

| 환경 | 프론트엔드 | 백엔드 API |
|---|---|---|
| Local | `http://localhost:5173` | `http://localhost:8080/api/v1` |
| Dev | `https://j14e205.p.ssafy.io/dev` | `https://j14e205.p.ssafy.io/dev/api/v1` |
| Prod | `https://j14e205.p.ssafy.io` | `https://j14e205.p.ssafy.io/api/v1` |

---

## 3. ERD 정보

### Enum 정의

```
role:             PATIENT | GUARDIAN
gender:           M | F
matching_status:  PENDING | LINKED | UNLINKED
content_type:     TEXT | PHRASE | EXPRESSION
call_type:        NORMAL | SOS
call_status:      PENDING | RECEIVED | MISSED
tts_status:       NONE | TRAINING | READY | FAILED
mood_type:        SAD | HAPPY | CALM | JOYFUL | ANXIOUS | ANGRY | TIRED
sentiment_type:   POSITIVE | NEGATIVE | NEUTRAL
```

### 테이블 정의

#### USER (공통 로그인)
```
id          bigint      PK, AUTO_INCREMENT
login_id    varchar     UNIQUE, NOT NULL  -- 이메일 주소
password    varchar     NOT NULL          -- BCrypt 해시
name        varchar     NOT NULL
role        role(enum)  NOT NULL          -- PATIENT | GUARDIAN
is_agree    boolean     NOT NULL, DEFAULT false
created_at  datetime    NOT NULL
updated_at  datetime    NOT NULL
```

#### PATIENT (환자 프로필)
```
id          bigint        PK, AUTO_INCREMENT
user_id     bigint        FK → USER, UNIQUE, NULL 가능
                          -- NULL: 보호자 설문 입력 시 생성, 환자 미가입 상태
                          -- 환자 가입 완료 시 채워짐
name        varchar       NOT NULL  -- 보호자가 대신 입력
birth_year  int           NOT NULL
gender      gender(enum)  NOT NULL  -- M | F
fcm_token   varchar       NULL 가능
created_at  datetime      NOT NULL
updated_at  datetime      NOT NULL
```

#### GUARDIAN (보호자 프로필)
```
id          bigint    PK, AUTO_INCREMENT
user_id     bigint    FK → USER, UNIQUE, NOT NULL
fcm_token   varchar   NULL 가능
created_at  datetime  NOT NULL
updated_at  datetime  NOT NULL
```

#### MATCHING (환자-보호자 매칭)
```
id           bigint           PK, AUTO_INCREMENT
patient_id   bigint           FK → PATIENT, UNIQUE, NOT NULL
guardian_id  bigint           FK → GUARDIAN, UNIQUE, NOT NULL
invite_code  varchar          UNIQUE, NOT NULL
status       matching_status  NOT NULL
             -- PENDING:  보호자 설문 완료 + 초대코드 발급, 환자 미가입
             -- LINKED:   환자 가입 완료, 정상 연결
             -- UNLINKED: 연결 끊어진 상태
linked_at    datetime         NULL 가능
created_at   datetime         NOT NULL
updated_at   datetime         NOT NULL
```

#### PATIENT_SETTING — MATCHING과 1:1
```
id                bigint    PK, AUTO_INCREMENT
matching_id       bigint    FK → MATCHING, UNIQUE, NOT NULL
activation_delay  int       NOT NULL
dwell_time        int       NOT NULL
created_at        datetime  NOT NULL
updated_at        datetime  NOT NULL
```

#### TTS_SETTING — MATCHING과 1:1
```
id           bigint      PK, AUTO_INCREMENT
matching_id  bigint      FK → MATCHING, UNIQUE, NOT NULL
is_enabled   boolean     NOT NULL, DEFAULT false
status       tts_status  NOT NULL, DEFAULT NONE
created_at   datetime    NOT NULL
updated_at   datetime    NOT NULL
```

#### TTS_VOICE_FILE — TTS_SETTING과 1:N
```
id              bigint    PK, AUTO_INCREMENT
tts_setting_id  bigint    FK → TTS_SETTING, NOT NULL
file_url        varchar   NOT NULL
file_name       varchar   NOT NULL
created_at      datetime  NOT NULL
```

#### USER_WORDS — MATCHING과 1:1
```
matching_id  bigint    PK, FK → MATCHING
subjects     json
objects      json
verbs        json
created_at   datetime  NOT NULL
updated_at   datetime  NOT NULL
```

#### MESSAGE — MATCHING과 1:N
```
id            bigint        PK, AUTO_INCREMENT
matching_id   bigint        FK → MATCHING, NOT NULL
sender_role   role(enum)    NOT NULL
content_type  content_type  NOT NULL
content       text          NOT NULL
phrase_id     bigint        FK → PHRASE, NULL 가능
expr_id       bigint        FK → EXPRESSIONS, NULL 가능
is_read       boolean       NOT NULL, DEFAULT false
created_at    datetime      NOT NULL
INDEX: (matching_id, created_at)
```

#### CALL — MATCHING과 1:N
```
id           bigint       PK, AUTO_INCREMENT
matching_id  bigint       FK → MATCHING, NOT NULL
type         call_type    NOT NULL
status       call_status  NOT NULL
created_at   datetime     NOT NULL
INDEX: (matching_id, created_at)
```

#### FAVORITE_PHRASE — MATCHING:PHRASE M:N 중간 테이블
```
id           bigint    PK, AUTO_INCREMENT
matching_id  bigint    FK → MATCHING, NOT NULL
phrase_id    bigint    FK → PHRASE, NOT NULL
created_at   datetime  NOT NULL
UNIQUE (matching_id, phrase_id)
```

#### LEISURE_CONTENT — MATCHING과 1:N
```
id           bigint    PK, AUTO_INCREMENT
matching_id  bigint    FK → MATCHING, NOT NULL
position     int       NOT NULL
name         varchar   NOT NULL
url          varchar   NULL 가능
category     varchar   NULL 가능
created_at   datetime  NOT NULL
updated_at   datetime  NOT NULL
UNIQUE (matching_id, position)
```

#### ROUTINE_SLOT_TAG — MATCHING과 1:N
```
id               bigint    PK, AUTO_INCREMENT
matching_id      bigint    FK → MATCHING, NOT NULL
time_slot_id     bigint    FK → TIME_SLOT, NOT NULL
activity_tag_id  bigint    FK → ACTIVITY_TAG, NOT NULL
created_at       datetime  NOT NULL
UNIQUE (matching_id, time_slot_id, activity_tag_id)
```

#### TIME_SLOT — 시드 데이터 7행 고정
```
1: 기상/아침 06:00~09:00 / 2: 오전 09:00~12:00 / 3: 점심/낮 12:00~15:00
4: 오후 15:00~18:00 / 5: 저녁 18:00~21:00 / 6: 취침준비 21:00~00:00
7: 야간 00:00~06:00
```

#### ACTIVITY_TAG — 시드 데이터 11행 고정
```
1: 경관식/수분 섭취 / 2: 약물 투여 / 3: 구강 케어 / 4: 체위 변경
5: 흡인/호흡 케어 / 6: 배변/배뇨 케어 / 7: 재활/ROM 운동 / 8: 세면/위생
9: 영상 시청 / 10: 외부인 방문 / 11: 휴식/수면
```

#### USAGE_LOG — MATCHING과 1:N
```
id           bigint     PK, AUTO_INCREMENT
matching_id  bigint     FK → MATCHING, NOT NULL
phrase_id    bigint     FK → PHRASE, NULL 가능
expr_id      bigint     FK → EXPRESSIONS, NULL 가능
content      varchar    NULL 가능
time_slot_id bigint     FK → TIME_SLOT, NOT NULL
mood_type    mood_type  NULL 가능
mood_level   int        NULL 가능  (1~5)
used_at      datetime   NOT NULL
```

#### EXPRESSIONS — MATCHING과 1:N
```
id           bigint          PK, AUTO_INCREMENT
matching_id  bigint          FK → MATCHING, NOT NULL
content      varchar         NOT NULL
sentiment    sentiment_type  NULL 가능
category     varchar         NULL 가능
last_used    datetime        NULL 가능
created_at   datetime        NOT NULL
```

#### EXPRESSION_KEYWORDS — EXPRESSIONS와 1:N
```
id       bigint   PK, AUTO_INCREMENT
expr_id  bigint   FK → EXPRESSIONS, NOT NULL
keyword  varchar  NOT NULL
```

#### DAILY_MOOD — MATCHING과 1:N
```
id           bigint     PK, AUTO_INCREMENT
matching_id  bigint     FK → MATCHING, NOT NULL
mood_date    date       NOT NULL
mood_type    mood_type  NOT NULL
mood_level   int        NOT NULL  (1~5)
created_at   datetime   NOT NULL
UNIQUE (matching_id, mood_date)
```

#### CATEGORY — 자기참조 계층형
```
id           bigint    PK, AUTO_INCREMENT
parent_id    bigint    FK → CATEGORY, NULL 가능
name         varchar   NOT NULL
depth        int       NOT NULL  (0=최상위, 1=중간, 2=말단)
order_index  int       NOT NULL
created_at   datetime  NOT NULL
```

#### PHRASE — 시드 데이터
```
id           bigint    PK, AUTO_INCREMENT
category_id  bigint    FK → CATEGORY, NOT NULL
content      varchar   NOT NULL
order_index  int       NOT NULL
created_at   datetime  NOT NULL
```

#### GENERAL_CORPUS — 단독 테이블
```
id          bigint          PK, AUTO_INCREMENT
content     text            NOT NULL
sentiment   sentiment_type  NULL 가능
weight      float           NOT NULL, DEFAULT 1.0
created_at  datetime        NOT NULL
```

---

## 4. API 컨벤션

### 성공 응답 포맷
```json
{ "code": "CREATED", "message": "생성에 성공하였습니다", "data": { ... } }
{ "code": "SUCCESS", "message": "요청이 성공하였습니다", "data": { ... } }
{ "code": "SUCCESS", "message": "요청이 성공하였습니다" }
```

### 에러 응답 포맷
```json
{ "code": "PATIENT-301", "message": "환자를 찾을 수 없습니다", "timestamp": "2026-03-19T14:30:00" }
{
  "code": "COMMON-101",
  "message": "입력값이 올바르지 않습니다",
  "timestamp": "2026-03-19T14:30:00",
  "errors": [{ "field": "name", "message": "이름은 필수입니다" }]
}
```

---

## 5. 에러 코드 테이블

| 코드 | HTTP | 메시지 |
|---|---|---|
| COMMON-101 | 400 | 입력값이 올바르지 않습니다 |
| COMMON-102 | 404 | 요청한 리소스를 찾을 수 없습니다 |
| SERVER-001 | 500 | 서버 내부 오류가 발생하였습니다 |
| AUTH-201 | 401 | 토큰이 만료되었습니다 |
| AUTH-202 | 401 | 유효하지 않은 토큰입니다 |
| AUTH-203 | 403 | 접근 권한이 없습니다 |
| AUTH-204 | 409 | 이미 등록된 이메일입니다 |
| AUTH-205 | 401 | 이메일 또는 비밀번호가 일치하지 않습니다 |
| PATIENT-301 | 404 | 환자를 찾을 수 없습니다 |
| PATIENT-302 | 409 | 이미 등록된 환자입니다 |
| GUARDIAN-401 | 404 | 보호자를 찾을 수 없습니다 |
| GUARDIAN-402 | 409 | 이미 연결된 보호자입니다 |
| CALL-501 | 500 | 호출 전송에 실패하였습니다 |
| CALL-502 | 429 | 호출 빈도 제한을 초과하였습니다 |
| CALL-503 | 404 | 호출 정보를 찾을 수 없습니다 |
| COMM-601 | 404 | 카테고리를 찾을 수 없습니다 |
| COMM-602 | 404 | 표현을 찾을 수 없습니다 |
| COMM-603 | 404 | 불편 부위를 찾을 수 없습니다 |
| AI-701 | 500 | AI 추천 생성에 실패하였습니다 |
| AI-702 | 502 | AI 서버 응답 시간이 초과되었습니다 |
| CUSTOM-901 | 404 | 커스텀 슬롯을 찾을 수 없습니다 |
| CUSTOM-902 | 400 | 커스텀 슬롯은 최대 4개까지 등록할 수 있습니다 |
| MATCHING-801 | 404 | 유효하지 않은 팀코드입니다 |
| MATCHING-802 | 409 | 이미 사용된 팀코드입니다 |

---

## 6. 프로젝트 디렉터리 구조

```
eyespeak/
├── src/main/java/e205/eyespeak/
│   ├── EyespeakApplication.java                  ← 앱의 시작점
│   │
│   ├── domain/
│   │   ├── auth/
│   │   │   ├── controller/
│   │   │   │   └── AuthController.java           ← 로그인, 로그아웃, 재발급, 보호자/환자 회원가입, 회원탈퇴
│   │   │   ├── service/
│   │   │   │   └── AuthService.java
│   │   │   ├── dto/
│   │   │   │   ├── request/
│   │   │   │   │   ├── GuardianCreateRequest.java
│   │   │   │   │   ├── PatientCreateRequest.java
│   │   │   │   │   └── LoginRequest.java
│   │   │   │   └── response/
│   │   │   │       ├── GuardianResponse.java
│   │   │   │       ├── PatientResponse.java
│   │   │   │       └── AuthResponse.java
│   │   │   └── repository/
│   │   │       └── UserRepository.java
│   │   │
│   │   ├── user/
│   │   │   └── entity/
│   │   │       └── User.java                     ← user 테이블 엔티티
│   │   │
│   │   ├── patient/
│   │   │   ├── controller/
│   │   │   │   └── PatientController.java        ← 환자 정보 등록
│   │   │   ├── service/
│   │   │   │   └── PatientService.java
│   │   │   ├── dto/
│   │   │   │   └── request/
│   │   │   │       └── PatientRegisterRequest.java
│   │   │   ├── repository/
│   │   │   │   └── PatientRepository.java
│   │   │   └── entity/
│   │   │       └── Patient.java
│   │   │
│   │   ├── guardian/
│   │   │   ├── repository/
│   │   │   │   └── GuardianRepository.java
│   │   │   └── entity/
│   │   │       └── Guardian.java
│   │   │
│   │   └── matching/
│   │       ├── controller/
│   │       │   └── MatchingController.java       ← 초대코드 발급
│   │       ├── service/
│   │       │   └── MatchingService.java
│   │       ├── dto/
│   │       │   ├── request/
│   │       │   │   └── MatchingCreateRequest.java
│   │       │   └── response/
│   │       │       └── MatchingResponse.java
│   │       ├── repository/
│   │       │   └── MatchingRepository.java
│   │       └── entity/
│   │           └── Matching.java
│   │
│   └── global/
│       ├── common/
│       │   ├── BaseEntity.java                   ← 모든 DB 테이블의 부모 (createdAt, updatedAt)
│       │   └── ApiResponse.java                  ← 성공 응답 포맷
│       ├── error/
│       │   ├── ErrorCode.java                    ← 에러 코드 모음
│       │   ├── ErrorResponse.java                ← 에러 응답 포맷
│       │   ├── BusinessException.java            ← 에러 던지는 도구
│       │   └── GlobalExceptionHandler.java       ← 에러 잡아서 응답 변환
│       ├── config/
│       │   ├── CorsConfig.java                   ← 프론트↔백엔드 통신 허용 (CORS)
│       │   ├── SecurityConfig.java               ← Spring Security 설정
│       │   └── JwtConfig.java                    ← JWT 설정
│       └── jwt/
│           ├── JwtProvider.java                  ← 토큰 생성/검증
│           └── JwtFilter.java                    ← 요청마다 토큰 확인
│
├── src/main/resources/
│   ├── application.yml                           ← 공통 설정
│   ├── application-local.yml                     ← 로컬 환경 설정
│   ├── application-dev.yml                       ← 개발 서버 설정
│   └── application-prod.yml                      ← 운영 서버 설정
│
├── docker-compose.local.yml                      ← 로컬 DB 컨테이너
├── build.gradle                                  ← 의존성 관리
└── .gitignore                                    ← git에 안 올릴 파일 목록
```

---

## 7. Git 커밋 컨벤션

### 커밋 메시지 형식
```
git commit -m "타입(영역): 상세 내용" -m "Jira티켓번호"
```

### 타입
| 타입 | 설명 |
|---|---|
| feat | 새로운 기능 |
| fix | 버그 수정 |
| docs | 문서 수정 |
| refactor | 코드 개선 (동작 동일) |
| style | 코드 스타일 수정 (세미콜론, 포맷팅 등) |
| test | 테스트 코드 |
| chore | 빌드 설정, 패키지 등 잡다한 작업 |

### 브랜치 명명 규칙
```
타입/영역/Jira티켓번호-기능내용
예: feat/server/S14P21E205-101-login-signup
```

### MR 규칙
- Source branch → develop 으로 MR
- MR 제목: `타입(영역): 작업 내용 요약`
- Description에 Jira 티켓 번호, 변경 사항, 리뷰 포인트, 참고 사항 포함