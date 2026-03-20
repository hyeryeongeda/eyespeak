## POST /auth/check-email — 이메일 중복 확인

---

## 1) Request

### Headers

- `Content-Type: application/json`
- (Auth=X) `Authorization` 없음

### Path Params

- 없음

### Query Params

- 없음

### Body

| key | 설명 | value 타입 | 옵션(ENUM) | Nullable | 예시 |
| --- | --- | --- | --- | --- | --- |
| email | 검증할 이메일 | string |  | X | `test@email.com` |

### Body Example

```json
{
  "email": "test@email.com"
}
```

---

## 2) Response

### Response Envelope(공통)

```json
{
  "code": "SUCCESS",
  "message": "요청이 성공하였습니다"
}
```

### data 스키마

| key | 설명 | value 타입 | 옵션(ENUM) | Nullable | 예시 |
| --- | --- | --- | --- | --- | --- |
| (없음) | 데이터 없음 | — | — | — | — |

### Response Example — 사용 가능한 이메일 (200)

```json
{
  "code": "SUCCESS",
  "message": "요청이 성공하였습니다"
}
```

### Response Example — 이미 사용 중인 이메일 (409)

```json
{
  "code": "AUTH-204",
  "message": "이미 등록된 이메일입니다",
  "timestamp": "2026-03-20T14:30:00"
}
```

### Response Example — 입력값 오류 (400)

```json
{
  "code": "COMMON-101",
  "message": "입력값이 올바르지 않습니다",
  "timestamp": "2026-03-20T14:30:00",
  "errors": [
    { "field": "email", "message": "이메일은 필수입니다" }
  ]
}
```

---

## 3) Status / Errors

| status | 의미 | 비고 |
| --- | --- | --- |
| 200 | 성공 | 사용 가능한 이메일 |
| 400 | 요청값 오류 | 이메일 누락 또는 형식 불일치 |
| 409 | 충돌 | 이미 사용 중인 이메일 |
| 500 | 서버 오류 |  |

---

## 4) Notes / TBD

- 회원가입 화면에서 이메일 입력 후 중복 확인 버튼 클릭 시 호출
- 200이면 사용 가능, 409이면 이미 사용 중으로 프론트에서 분기 처리
- 인증 토큰 불필요 (`/auth/**` permitAll)
