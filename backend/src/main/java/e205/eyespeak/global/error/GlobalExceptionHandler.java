package e205.eyespeak.global.error;

/*
 * 애플리케이션 전역 예외 처리기
 * - Controller, Service 는 예외를 던지기만 하면 되고 응답 변환은 여기서 담당
 */

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@Slf4j
@RestControllerAdvice
@Getter
public class GlobalExceptionHandler {

    /*
     * 1. 비즈니스 예외 처리
     *    Service 에서 throw new BusinessException(ErrorCode.PATIENT_NOT_FOUND) 하면 여기서 잡힘
     *    ErrorCode 에 정의된 HTTP 상태와 에러 정보를 그대로 응답
     */
    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ErrorResponse.of(errorCode));
    }

    /*
     * 2. @Valid 유효성 검사 실패 처리
     * - Controller 에서 @Valid 붙인 DTO 의 유효성 검사가 실패하면 여기서 잡힘
     * - 어떤 필드가 왜 실패했는지 목록으로 응답
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException e) {
        // spring 이 잡은 필드 에러들을 ErrorResponse.FieldError 형태로 반환
        List<ErrorResponse.FieldError> fieldErrors = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> ErrorResponse.FieldError.builder()
                        .field(error.getField())
                        .message(error.getDefaultMessage())
                        .build())
                .toList();

        return ResponseEntity
                .status(ErrorCode.INVALID_INPUT.getStatus())
                .body(ErrorResponse.of(ErrorCode.INVALID_INPUT, fieldErrors));
    }

    /*
     * 3. 엔티티 검증 실패 (Builder 등에서 IllegalArgumentException 던질 때)
     * - 잘못된 입력이므로 400 Bad Request 로 응답
     */
    @ExceptionHandler(IllegalArgumentException.class)
    protected ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException e) {
        return ResponseEntity
                .status(ErrorCode.INVALID_INPUT.getStatus())
                .body(ErrorResponse.of(ErrorCode.INVALID_INPUT));
    }

    /*
     * 4. 그 외 모든 예외
     * - BusinessException 도 아니고 Validation 에러도 아닌 예상하지 못한 모든 예외
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity
                .status(ErrorCode.INTERNAL_SERVER_ERROR.getStatus())
                .body(ErrorResponse.of(ErrorCode.INTERNAL_SERVER_ERROR));
    }
}