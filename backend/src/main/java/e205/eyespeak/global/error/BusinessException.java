package e205.eyespeak.global.error;

/*
 * 비즈니스 로직에서 발생하는 커스텀 예외
 */

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
