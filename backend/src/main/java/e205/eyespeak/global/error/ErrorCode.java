package e205.eyespeak.global.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/*
 * 애플리케이션의 모든 에러 코드를 한 곳에서 관리
 *
 * - 에러 코드가 여기저기 흩어져 있으면 중복되거나 일관성이 깨짐
 * - 에러 코드, HTTP 상태, 메시지를 한 곳에서 관리하면 새 에러 추가 시 여기만 보면 됨
 * - 프론트엔드와 에러 코드표 공유 시 에러 처리 편해짐
 */

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // ====== COMMON (공통) ======

    INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON-101",
            "입력값이 올바르지 않습니다"),
    // → @Valid 유효성 검사 실패 시. 예: 이름 빈칸, 전화번호 형식 틀림

    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON-102",
            "요청한 리소스를 찾을 수 없습니다"),
    // → 도메인 특화 에러코드가 없을 때 범용으로 사용

    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "SERVER-001",
            "서버 내부 오류가 발생하였습니다"),
    // → 예상하지 못한 에러. catch 안 된 예외가 여기로 옴

    // ====== AUTH (인증/인가) ======

    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "AUTH-201",
            "토큰이 만료되었습니다"),
    // → Access Token 30분 지남. 프론트에서 이거 받으면 refresh 요청 보내야 함

    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "AUTH-202",
            "유효하지 않은 토큰입니다"),
    // → 토큰 위조, 형식 오류 등

    ACCESS_DENIED(HttpStatus.FORBIDDEN, "AUTH-203",
            "접근 권한이 없습니다"),
    // → 환자가 보호자 전용 API 호출했을 때 등. 인증은 됐지만 권한이 없음

    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "AUTH-204",
            "이미 등록된 이메일입니다"),
    // → 회원가입 시 이메일 중복

    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "AUTH-205",
            "이메일 또는 비밀번호가 일치하지 않습니다"),
    // → 로그인 실패. "이메일이 없다" vs "비밀번호 틀림"을 구분 안 하는 게 보안상 좋음

    // ====== PATIENT (환자) ======

    PATIENT_NOT_FOUND(HttpStatus.NOT_FOUND, "PATIENT-301",
            "환자를 찾을 수 없습니다"),
    // → 없는 환자 ID로 조회/수정 시

    PATIENT_ALREADY_EXISTS(HttpStatus.CONFLICT, "PATIENT-302",
            "이미 등록된 환자입니다"),
    // → 같은 환자 중복 등록 시도

    // ====== GUARDIAN (보호자) ======

    GUARDIAN_NOT_FOUND(HttpStatus.NOT_FOUND, "GUARDIAN-401",
            "보호자를 찾을 수 없습니다"),

    GUARDIAN_ALREADY_LINKED(HttpStatus.CONFLICT, "GUARDIAN-402",
            "이미 연결된 보호자입니다"),
    // → 같은 보호자를 같은 환자에 또 연결하려 할 때

    // ====== CALL (SOS 호출) ======

    CALL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "CALL-501",
            "호출 전송에 실패하였습니다"),
    // → FCM 전송 실패 등

    CALL_RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "CALL-502",
            "호출 빈도 제한을 초과하였습니다"),
    // → 30초 이내 재호출. 환자 실수 연타 방지. 첫 호출은 항상 통과

    CALL_NOT_FOUND(HttpStatus.NOT_FOUND, "CALL-503",
            "호출 정보를 찾을 수 없습니다"),
    // → 호출 수락/거절 시 해당 호출이 없을 때

    // ====== CHAT (채팅) ======

    CHAT_INVALID_CONTENT_TYPE(HttpStatus.BAD_REQUEST, "CHAT-551",
            "유효하지 않은 메시지 타입입니다"),
    // → contentType이 null이거나 지원하지 않는 타입

    CHAT_TEXT_EMPTY(HttpStatus.BAD_REQUEST, "CHAT-552",
            "텍스트 메시지 내용이 비어있습니다"),
    // → contentType이 TEXT인데 text 필드가 null 또는 빈 문자열

    CHAT_PHRASE_ID_REQUIRED(HttpStatus.BAD_REQUEST, "CHAT-553",
            "문구 ID가 필요합니다"),
    // → contentType이 PHRASE인데 phraseId가 null

    CHAT_EXPRESSION_ID_REQUIRED(HttpStatus.BAD_REQUEST, "CHAT-554",
            "표현 ID가 필요합니다"),
    // → contentType이 EXPRESSION인데 expressionId가 null

    CHAT_MATCHING_MISMATCH(HttpStatus.FORBIDDEN, "CHAT-555",
            "본인의 매칭이 아닌 채팅에는 접근할 수 없습니다"),
    // → 요청자의 매칭 ID와 요청한 매칭 ID가 불일치 (남의 채팅 조회 시도)

    // ====== COMMUNICATION (의사소통) ======
    // 특화소통 카테고리, 표현, 불편부위

    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "COMM-601",
            "카테고리를 찾을 수 없습니다"),

    EXPRESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "COMM-602",
            "표현을 찾을 수 없습니다"),

    PHRASE_NOT_FOUND(HttpStatus.NOT_FOUND, "COMM-603",
            "문구를 찾을 수 없습니다"),
    // → phrase 테이블에서 해당 ID를 찾을 수 없을 때

    PAIN_AREA_NOT_FOUND(HttpStatus.NOT_FOUND, "COMM-604",
            "불편 부위를 찾을 수 없습니다"),

    // ====== AI (추천/문장 생성) ======

    AI_RECOMMENDATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI-701",
            "AI 추천 생성에 실패하였습니다"),
    // → FastAPI 서버에서 추천 생성 실패

    AI_SERVER_TIMEOUT(HttpStatus.BAD_GATEWAY, "AI-702",
            "AI 서버 응답 시간이 초과되었습니다"),
    // → FastAPI 서버가 안 응답. 이때 콜드스타트 기본 추천으로 폴백해야 함

    // ====== CUSTOM (커스텀 슬롯) ======

    CUSTOM_SLOT_NOT_FOUND(HttpStatus.NOT_FOUND, "CUSTOM-901",
            "커스텀 슬롯을 찾을 수 없습니다"),

    CUSTOM_SLOT_LIMIT(HttpStatus.BAD_REQUEST, "CUSTOM-902",
            "커스텀 슬롯은 최대 4개까지 등록할 수 있습니다"),
    // → 프로토타입에서 커스텀 칸이 4개니까 4개 제한

    // ====== MATCHING (매칭) ======

    INVALID_INVITE_CODE(HttpStatus.NOT_FOUND, "MATCHING-801",
            "유효하지 않은 팀코드입니다"),
    // → 초대코드가 존재하지 않을 때

    INVITE_CODE_ALREADY_USED(HttpStatus.CONFLICT, "MATCHING-802",
            "이미 사용된 팀코드입니다"),
    // → 이미 LINKED 상태인 초대코드로 가입 시도

    MATCHING_NOT_FOUND(HttpStatus.NOT_FOUND, "MATCHING-803",
            "매칭 정보를 찾을 수 없습니다"),
    // → 매칭이 아직 생성되지 않았을 때 (환자 정보 미등록)

    // ====== FAVORITE (즐겨찾기) ======

    FAVORITE_LIMIT(HttpStatus.BAD_REQUEST, "COMM-605",
            "즐겨찾기는 최대 5개까지 등록할 수 있습니다"),
    // → 즐겨찾기 5개 초과 시도

    FAVORITE_NOT_FOUND(HttpStatus.NOT_FOUND, "COMM-606",
            "즐겨찾기를 찾을 수 없습니다"),
    // → 존재하지 않는 즐겨찾기 ID

    FAVORITE_DUPLICATE(HttpStatus.CONFLICT, "COMM-607",
            "이미 즐겨찾기에 등록된 표현입니다"),
    // → 동일 표현 중복 등록

    // ====== LEISURE (여가 콘텐츠) ======

    LEISURE_CONTENT_NOT_FOUND(HttpStatus.NOT_FOUND, "LEISURE-1001",
            "여가 콘텐츠를 찾을 수 없습니다"),

    LEISURE_CONTENT_LIMIT(HttpStatus.BAD_REQUEST, "LEISURE-1002",
            "여가 콘텐츠는 최대 5개까지 등록할 수 있습니다"),

    LEISURE_INVALID_CONTENT(HttpStatus.BAD_REQUEST, "LEISURE-1003",
            "URL 또는 카테고리 중 하나를 입력해야 합니다"),

    LEISURE_INVALID_CATEGORY(HttpStatus.BAD_REQUEST, "LEISURE-1004",
            "유효하지 않은 YouTube 카테고리입니다"),

    LEISURE_INVALID_URL(HttpStatus.BAD_REQUEST, "LEISURE-1005",
            "유효하지 않은 YouTube URL입니다"),

    // ====== TTS (음성 설정) ======

    TTS_SETTING_NOT_FOUND(HttpStatus.NOT_FOUND, "TTS-1101",
            "TTS 설정을 찾을 수 없습니다"),

    TTS_UNSUPPORTED_FORMAT(HttpStatus.BAD_REQUEST, "TTS-1102",
            "지원하지 않는 파일 형식입니다"),

    TTS_VOICE_FILE_LIMIT(HttpStatus.BAD_REQUEST, "TTS-1103",
            "최대 10개까지 등록 가능합니다"),

    TTS_VOICE_FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "TTS-1104",
            "TTS 음성 파일을 찾을 수 없습니다"),

    TTS_FILE_SAVE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TTS-1105",
            "파일 저장에 실패하였습니다"),

    // ====== SETTING (환자 설정) ======

    SETTING_NOT_FOUND(HttpStatus.NOT_FOUND, "SETTING-1101",
            "환자 설정을 찾을 수 없습니다"),

    INVALID_PRESET_VALUE(HttpStatus.BAD_REQUEST, "SETTING-1102",
            "허용되지 않는 설정값입니다");


    // enum 필드: 각 에러 코드는 이 3가지를 가짐
    private final HttpStatus status;  // HTTP 상태 코드 (404, 500 등)
    private final String code;        // 우리가 정한 에러 코드 문자열 ("PATIENT-301")
    private final String message;     // 사람이 읽을 메시지
}
