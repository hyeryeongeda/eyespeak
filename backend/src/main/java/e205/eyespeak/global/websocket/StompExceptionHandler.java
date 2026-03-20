package e205.eyespeak.global.websocket;

import e205.eyespeak.global.error.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.ControllerAdvice;

import java.security.Principal;
import java.util.Map;

/**
 * [Unit 4] STOMP 에러 핸들러 (REST의 GlobalExceptionHandler의 WebSocket 버전)
 *
 * REST에서는 예외 발생 시 HTTP 응답(400, 500 등)으로 에러를 돌려주지만,
 * STOMP에서는 HTTP 응답이 없으므로 /user/queue/errors 채널로 에러 메시지를 보낸다.
 *
 * @MessageExceptionHandler: @MessageMapping 메서드에서 예외가 발생하면 Spring이 자동 호출.
 * (직접 호출하는 코드가 없어도 Spring이 예외를 감지하여 알아서 실행)
 */
@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class StompExceptionHandler {

    private final SimpMessagingTemplate messagingTemplate;

    /** 비즈니스 예외 (ErrorCode가 있는 예외) → 에러 코드와 메시지를 클라이언트에 전달 */
    @MessageExceptionHandler(BusinessException.class)
    public void handleBusinessException(BusinessException ex, Principal principal) {
        log.warn("STOMP 비즈니스 예외: code={}, message={}", ex.getErrorCode().getCode(), ex.getMessage());
        sendError(principal, ex.getErrorCode().getCode(), ex.getMessage());
    }

    /** 예상하지 못한 예외 → 일반적인 서버 에러 메시지를 클라이언트에 전달 */
    @MessageExceptionHandler(Exception.class)
    public void handleException(Exception ex, Principal principal) {
        log.error("STOMP 예외 발생", ex);
        sendError(principal, "SERVER-001", "서버 내부 오류가 발생하였습니다");
    }

    private void sendError(Principal principal, String code, String message) {
        if (principal != null) {
            messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/errors",
                    Map.of("code", code, "message", message)
            );
        }
    }
}
