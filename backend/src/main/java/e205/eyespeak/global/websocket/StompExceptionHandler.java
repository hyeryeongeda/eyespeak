package e205.eyespeak.global.websocket;

import e205.eyespeak.global.error.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.ControllerAdvice;

import java.security.Principal;
import java.util.Map;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class StompExceptionHandler {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageExceptionHandler(BusinessException.class)
    public void handleBusinessException(BusinessException ex, Principal principal) {
        log.warn("STOMP 비즈니스 예외: code={}, message={}", ex.getErrorCode().getCode(), ex.getMessage());
        sendError(principal, ex.getErrorCode().getCode(), ex.getMessage());
    }

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
