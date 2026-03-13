# 백엔드 로컬 환경 변수 설정 가이드

아무 설정도 안 했을 때, 처음부터 따라 하면 됩니다.

---

## 1단계: Spring 앱용 `.env` 만들기

Spring Boot가 **로컬 MySQL**에 접속할 때 쓰는 계정입니다.

1. `backend` 폴더로 이동합니다.
2. `.env.example` 을 **복사**해서 파일 이름을 **`.env`** 로 바꿉니다.
3. `.env` 파일을 열고 **비밀번호만** 채웁니다.

```env
# 로컬 개발용 DB 환경변수 (application-local 프로필)
# IDE Run Configuration 에서 로드하거나, 터미널에서 export 후 실행

DB_USERNAME=root
DB_PASSWORD=root1234
```

- `DB_PASSWORD` 에 넣은 값은 **2단계에서 MySQL에 넣을 비밀번호와 동일**하게 둡니다.
- `.env` 는 이미 `.gitignore` 에 있으므로 커밋되지 않습니다.

---

## 2단계: Docker Compose용 `.env.local` 만들기

MySQL, Redis, RabbitMQ 컨테이너를 띄울 때 쓰는 값입니다.

1. `backend` 폴더에서 `.env.local.example` 을 **복사**해서 **`.env.local`** 로 저장합니다.
2. 아래처럼 **같은 비밀번호**로 맞춰 넣습니다.

```env
MYSQL_ROOT_PASSWORD=root1234
MYSQL_DATABASE=eyespeak
```

- `MYSQL_ROOT_PASSWORD` = 1단계의 `DB_PASSWORD` 와 **같은 값** (예: `root1234`).
- `MYSQL_DATABASE` = 사용할 DB 이름 (그대로 `eyespeak` 사용해도 됨).
- RabbitMQ는 안 바꿔도 되고, 바꾸려면 주석 해제 후 `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS` 만 넣으면 됩니다.

---

## 3단계: Docker로 MySQL, Redis, RabbitMQ 띄우기

1. 터미널을 열고 **`backend`** 폴더로 이동합니다.

```bash
cd backend
```

2. 아래 명령으로 컨테이너를 띄웁니다.

```bash
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d
```

3. 정상 기동 확인:

```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml ps
```

- `eyespeak-db-local`, `eyespeak-redis-local`, `eyespeak-rabbitmq-local` 이 **Up** 이면 됩니다.
- MySQL: `localhost:3306`, Redis: `localhost:6379`, RabbitMQ UI: `http://localhost:15672` (계정 guest/guest)

---

## 4단계: Spring Boot 실행 설정 (IDE)

앱을 **local** 프로필로 돌리면서 `DB_USERNAME`, `DB_PASSWORD` 를 넘겨줘야 합니다.

### IntelliJ / Cursor

1. **Run** → **Edit Configurations** (또는 상단 실행 설정 톱니바퀴).
2. 사용하는 **Spring Boot 실행 설정**을 선택합니다.
3. **Environment variables** 칸을 찾습니다.
4. 아래 중 하나로 설정합니다.

**방법 A – 변수 직접 입력**

- 이름: `DB_USERNAME`  값: `root`
- 이름: `DB_PASSWORD`  값: `root1234` (1단계에서 정한 값)

**방법 B – .env 파일 사용 (지원하는 경우)**

- **EnvFile** 플러그인 사용 시: `.env` 파일을 선택해 로드.

5. **Active profiles** 에 `local` 이 들어가 있는지 확인합니다.  
   (또는 VM options: `-Dspring.profiles.active=local`)
6. **Apply** → **Run** 으로 실행합니다.

### 터미널에서 실행할 때

```bash
cd backend
export DB_USERNAME=root
export DB_PASSWORD=root1234
./gradlew bootRun --args='--spring.profiles.active=local'
```

(Windows PowerShell)

```powershell
$env:DB_USERNAME="root"
$env:DB_PASSWORD="root1234"
.\gradlew.bat bootRun --args='--spring.profiles.active=local'
```

---

## 5단계: 동작 확인

- Spring Boot 로그에 **Started EyespeakApplication** 이 보이면 성공입니다.
- `application-local.yml` 에 따라 DB는 `localhost:3306/eyespeak`, 서버 포트는 `8080` 입니다.
- 브라우저나 API 클라이언트로 `http://localhost:8080` 호출해 보면 됩니다.

---

## 요약 체크리스트

| 순서 | 할 일 | 파일/명령 |
|------|--------|-----------|
| 1 | Spring용 DB 계정 파일 만들기 | `.env.example` → `.env` 복사 후 `DB_USERNAME=root`, `DB_PASSWORD=root1234` |
| 2 | Docker용 DB 비밀번호 파일 만들기 | `.env.local.example` → `.env.local` 복사 후 `MYSQL_ROOT_PASSWORD=root1234`, `MYSQL_DATABASE=eyespeak` |
| 3 | DB/Redis/RabbitMQ 기동 | `docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d` |
| 4 | IDE에서 환경변수 + local 프로필 설정 | `DB_USERNAME`, `DB_PASSWORD` 설정, `spring.profiles.active=local` |
| 5 | Spring Boot 실행 | Run → 로그/API로 확인 |

---

## 자주 하는 질문

**Q. 비밀번호를 다른 걸로 바꾸고 싶어요.**  
- `.env` 의 `DB_PASSWORD` 와 `.env.local` 의 `MYSQL_ROOT_PASSWORD` 를 **같은 값**으로 맞춰서 바꾸면 됩니다.  
- 이미 MySQL을 띄운 상태면 컨테이너를 내렸다가 볼륨 삭제 후 다시 up 할 수도 있고, MySQL 안에서 root 비밀번호를 변경한 뒤 `.env` 만 맞춰도 됩니다.

**Q. Docker를 끄고 싶어요.**  
```bash
cd backend
docker-compose -f docker-compose.yml -f docker-compose.local.yml down
```

**Q. dev / prod 는?**  
- dev: `.env.dev.example` → `.env.dev` 복사 후 값 채우고,  
  `docker-compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml --profile blue up -d`  
- prod: `.env.prod.example` → `.env.prod` 복사 후 값 채우고,  
  `docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile blue --profile green up -d`

이 가이드만 따라 하면 “어케 설정해?” 는 전부 위 순서대로 하면 됩니다.
