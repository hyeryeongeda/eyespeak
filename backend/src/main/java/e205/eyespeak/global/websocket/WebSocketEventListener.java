package e205.eyespeak.global.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * WebSocket 연결/해제 이벤트 로깅
 *
 * 세션 등록/제거는 Spring의 SimpUserRegistry가 자동으로 처리하므로,
 * 이 리스너는 디버깅을 위한 로그 출력만 담당한다.
 */
@Slf4j
@Component
public class WebSocketEventListener {

    @EventListener
    public void handleConnect(SessionConnectEvent event) {
        StompPrincipal principal = (StompPrincipal) event.getUser();
        if (principal == null) {
            return;
        }
        String sessionId = event.getMessage().getHeaders().get("simpSessionId", String.class);
        log.info("WebSocket 세션 연결: userId={}, role={}, sessionId={}",
                principal.getUserId(), principal.getRole(), sessionId);
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        StompPrincipal principal = (StompPrincipal) event.getUser();

        if (principal != null) {
            log.info("WebSocket 세션 해제: userId={}, role={}, sessionId={}",
                    principal.getUserId(), principal.getRole(), sessionId);
        } else {
            log.info("WebSocket 세션 해제: sessionId={} (인증 미완료 세션)", sessionId);
        }
    }
}
