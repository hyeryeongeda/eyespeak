package e205.eyespeak.global.error;

/*
 * 모든 API 에러 응답의 공통 포맷
 */

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    private String code; // 에러 코드
    private String message; // 에러 메시지
    private LocalDateTime timestamp; // 에러 발생 시각(디버깅 + 로그 추적용)
    private List<FieldError> errors; // 유효성 검사 에러 목록

    /*
     * 일반 에러 응답 생성
     * 사용 예시: ErrorResponse.of(ErrorCode.PATIENT_NOT_FOUND)
     */
    public static ErrorResponse of(ErrorCode errorCode) {
        return ErrorResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
    }

    /*
     * 유효성 검사 에러 응답 생성(필드별 에러 목록)
     * 사용 예시: ErrorResponse.of(ErrorCode.INVALID_INPUT, fieldErrors)
     */
    public static ErrorResponse of(ErrorCode errorCode, List<FieldError> errors) {
        return ErrorResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .timestamp(LocalDateTime.now())
                .errors(errors)
                .build();
    }

    @Getter
    @Builder
    public static class FieldError {
        private String field;
        private String message;
    }
}
