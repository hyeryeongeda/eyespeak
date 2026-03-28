# 로컬에 DB 제대로 올리는 법

## 문제

`ddl-auto: create` + `data.sql` 자동 실행 시 **테이블 생성과 data.sql 실행 순서가 안 맞아서** 에러 발생.
`defer-datasource-initialization: true` 설정이 있어도 간헐적으로 실패함.

```
Failed to execute SQL script statement: INSERT INTO expressions ...
Caused by: Table 'eyespeak.expressions' doesn't exist
```

## 해결 방법

### 1단계: Docker DB 띄우기

```bash
# Docker Desktop 실행 확인
docker ps | grep db

# DB 컨테이너 시작 (안 떠있으면)
docker start eyespeak-db-local
```

### 2단계: DB 초기화

```bash
docker exec -i eyespeak-db-local mysql -u root -proot1234 -e "DROP DATABASE IF EXISTS eyespeak; CREATE DATABASE eyespeak;"
```

### 3단계: BE 서버 실행 (테이블 생성)

`application-local.yml`에서 data.sql 자동 실행이 꺼져있어야 함:

```yaml
spring:
  sql:
    init:
      mode: never    # data.sql 자동 실행 안 함
```

IntelliJ Run Configuration 환경변수:

```
SPRING_PROFILES_ACTIVE=local;DB_USERNAME=root;DB_PASSWORD=root1234;JWT_SECRET=Rh7B7MRrgkZFyD5GC9X0YlW4S2KQfsrcCY/VVK0u3SR5hLWR5UZQ3MuDffxO0ep6;AWS_ACCESS_KEY=dummy;AWS_SECRET_KEY=dummy;AWS_S3_BUCKET=dummy;AWS_REGION=ap-northeast-2
```

**주의:** Docker의 `eyespeak-was-local`이 8080 포트를 쓰고 있으면 먼저 멈추기:

```bash
docker stop eyespeak-was-local
```

IntelliJ에서 EyespeakApplication 실행 → `ddl-auto: create`가 테이블 생성.

### 4단계: data.sql 수동 실행

BE 서버 띄운 상태에서 Git Bash에서 한 줄로 실행:

```bash
docker exec -i eyespeak-db-local mysql -u root -proot1234 eyespeak < /c/Users/SSAFY/Desktop/S14P21E205/backend/src/main/resources/data.sql
```

### 5단계: 데이터 확인

```bash
docker exec -it eyespeak-db-local mysql -u root -proot1234 eyespeak -e "SELECT id FROM matching LIMIT 5;"
```

결과:

```
+----+
| id |
+----+
|  1 |
+----+
```

이게 나오면 성공!

## 참고

- `mode: never`로 바꾼 이유: `ddl-auto: create`와 data.sql 자동 실행 타이밍이 안 맞아서 테이블 없다는 에러 발생
- dev/prod에는 영향 없음 (로컬 Docker DB만 해당)
- data.sql은 `INSERT IGNORE`를 쓰므로 여러 번 실행해도 중복 안 됨
