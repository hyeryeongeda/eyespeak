# 회원가입/로그인 인증 테스트 기록

## 날짜: 2026-03-19

## 환경
- Docker 로컬 (docker-compose.local.yml)
- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- Swagger: http://localhost:8080/swagger-ui/index.html
- DB: MySQL 8.0 (ddl-auto: create → 재시작 시 초기화됨)

---

## 구현한 파일 목록

### 인증 (Auth)
| 파일 | 설명 |
|---|---|
| `build.gradle` | spring-security + jjwt 의존성 추가 |
| `application-local.yml` | JWT secret, 만료시간 설정 추가 |
| `UserRepository.java` | findByLoginId, existsByLoginId 추가 |
| `JwtProvider.java` | (신규) user_id 기준 토큰 생성/검증 |
| `JwtFilter.java` | (신규) 요청마다 Authorization 헤더 검사 |
| `SecurityConfig.java` | (신규) /api/v1/auth/** 허용, 나머지 인증 필요 |
| `AuthService.java` | (신규) 보호자 회원가입, 환자 회원가입, 로그인, 토큰 갱신 |
| `AuthController.java` | (신규) 5개 엔드포인트 |
| `LoginRequest.java` | (신규) 로그인 요청 DTO |
| `GuardianSignupRequest.java` | (신규) 보호자 회원가입 요청 DTO |
| `PatientSignupRequest.java` | (신규) 환자 회원가입 요청 DTO (팀코드 기반) |
| `RefreshRequest.java` | (신규) 토큰 갱신 요청 DTO |
| `AuthResponse.java` | (신규) 인증 응답 DTO (토큰 + 유저 정보) |
| `PatientSignupResponse.java` | (신규) 환자 회원가입 응답 DTO (patientId, teamCode 포함) |
| `CorsConfig.java` | localhost:3000, 5173 허용 추가 |

### 환자 등록 + 팀코드 발급
| 파일 | 설명 |
|---|---|
| `PatientController.java` | (신규) POST /api/v1/patients — 환자 정보 등록 + 팀코드 발급 |
| `PatientService.java` | (신규) 환자 프로필 생성 |
| `MatchingService.java` | (신규) 매칭 생성 + 6자리 팀코드 자동 발급 |
| `RoutineService.java` | (신규) 일과 설정 저장 (팀원 담당, 연동 준비만 됨) |
| `RegisterPatientRequest.java` | (신규) 환자 등록 요청 DTO (name, birthYear, gender, survey) |
| `RegisterPatientResponse.java` | (신규) 환자 등록 응답 DTO (patientId, teamCode, createdAt) |
| `MatchingRepository.java` | findByInviteCode 추가 |
| `Matching.java` | link() 메서드 추가 (상태 LINKED 변경) |

---

## API 엔드포인트

| 메서드 | URL | 설명 | 인증 |
|---|---|---|---|
| POST | /api/v1/auth/sign-up/guardian | 보호자 회원가입 | 불필요 |
| POST | /api/v1/auth/patients | 환자 회원가입 (팀코드로) | 불필요 |
| POST | /api/v1/auth/login | 로그인 | 불필요 |
| POST | /api/v1/auth/refresh | 토큰 갱신 | 불필요 |
| POST | /api/v1/auth/log-out | 로그아웃 | 불필요 |
| POST | /api/v1/patients | 환자 정보 등록 + 팀코드 발급 | 필요 (보호자 토큰) |

---

## 전체 회원가입 흐름

```
1. 보호자 회원가입
   POST /api/v1/auth/sign-up/guardian
   → User(GUARDIAN) + Guardian 생성 → accessToken 발급

2. 보호자가 환자 정보 등록 (보호자 토큰 필요)
   POST /api/v1/patients
   → Patient 생성 (user_id = NULL) + Matching 생성 + 팀코드 발급
   → 팀코드를 환자에게 전달

3. 환자가 팀코드로 회원가입
   POST /api/v1/auth/patients
   → User(PATIENT) 생성 + Patient에 User 연결 + Matching 상태 LINKED
```

---

## 테스트 결과

### 1. 보호자 회원가입 (POST /api/v1/auth/sign-up/guardian) ✅

**요청:**
```json
{
  "email": "test@test.com",
  "name": "테스트보호자",
  "password": "12345678"
}
```
**결과: 201 CREATED ✅**
- accessToken, refreshToken 정상 발급
- user.role: "GUARDIAN"

---

### 2. 로그인 (POST /api/v1/auth/login)

#### 2-1. role: "caregiver"로 로그인 ✅
```json
{
  "identifier": "test@test.com",
  "password": "12345678",
  "role": "caregiver"
}
```
**결과: 200 SUCCESS ✅** — 토큰 발급, role: "GUARDIAN"

#### 2-2. role: "GUARDIAN"으로 로그인 ✅
```json
{
  "identifier": "test@test.com",
  "password": "12345678",
  "role": "GUARDIAN"
}
```
**결과: 200 SUCCESS ✅** — caregiver/GUARDIAN 둘 다 로그인 성공 확인

---

### 3. 토큰 갱신 (POST /api/v1/auth/refresh) ✅

로그인 응답의 refreshToken을 넣어서 요청.
**결과: 200 SUCCESS ✅** — 새 accessToken, refreshToken 발급 확인

---

### 4. 환자 정보 등록 + 팀코드 발급 (POST /api/v1/patients) — 미테스트
- 코드 구현 완료, Docker 재빌드 후 테스트 필요

### 5. 환자 회원가입 (POST /api/v1/auth/patients) — 미테스트
- 코드 구현 완료, 4번 테스트 후 팀코드로 테스트 필요

---

## 발견된 이슈 & 조치

| # | 이슈 | 원인 | 조치 | 상태 |
|---|---|---|---|---|
| 1 | Swagger에 AuthController 안 보임 | Docker가 이전 이미지 사용 | `--env-file .env.local` 포함하여 재빌드 | ✅ 해결 |
| 2 | Docker WAS 재시작 루프 | DB 비밀번호 미전달 (using password: NO) | `--env-file .env.local` 명시 | ✅ 해결 |
| 3 | role이 "caregiver"로 반환됨 | AuthService에서 프론트용으로 변환하고 있었음 | user.getRole().name()으로 변경 | ✅ 해결 |
| 4 | role: "guardian"으로 로그인 시 실패 | "caregiver"만 GUARDIAN 매핑, 나머지는 PATIENT | caregiver/GUARDIAN 둘 다 지원하도록 수정 | ✅ 해결 |
| 5 | Docker 재시작 후 로그인 실패 | ddl-auto: create로 DB 초기화 | 재가입 필요 (추후 ddl-auto: update로 변경 권장) | ⚠️ 인지 |
| 6 | 토큰 갱신 시 500 에러 | JwtProvider.validateToken()에서 ExpiredJwtException throw | validateToken이 false 반환하도록 수정 | ✅ 해결 |

---

## 미테스트 항목

- [ ] 환자 정보 등록 + 팀코드 발급 (POST /api/v1/patients)
- [ ] 환자 팀코드 회원가입 (POST /api/v1/auth/patients)
- [ ] role: "PATIENT"로 로그인
- [ ] 이메일 중복 회원가입 시 에러 응답
- [ ] 잘못된 비밀번호 로그인 시 에러 응답
- [ ] 프론트엔드(localhost:3000) 연동 테스트
- [ ] 인증 필요 API에 토큰 없이 접근 시 403 확인

---

## 참고

- 일과 설정(routine) 저장은 팀원이 담당. RoutineService는 연동 준비만 되어 있음.
- 팀코드는 6자리 대문자+숫자, UUID 기반 자동 생성, 중복 검사 포함.
- Docker 빌드 명령: `cd backend && docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
