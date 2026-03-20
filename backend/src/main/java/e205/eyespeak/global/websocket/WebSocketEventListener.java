package e205.eyespeak.global.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final WebSocketSessionManager sessionManager;

    @EventListener
    public void handleConnect(SessionConnectEvent event) {
        StompPrincipal principal = (StompPrincipal) event.getUser();
        if (principal == null) {
            log.warn("WebSocket 연결 이벤트에 Principal이 없습니다. 인증 인터셉터를 확인하세요.");
            return;
        }
        sessionManager.addSession(principal.getName(), principal);
        log.info("WebSocket 세션 연결: userId={}, role={}", principal.getUserId(), principal.getRole());
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompPrincipal principal = (StompPrincipal) event.getUser();
        if (principal == null) {
            log.warn("WebSocket 해제 이벤트에 Principal이 없습니다.");
            return;
        }
        sessionManager.removeSession(principal.getName());
        log.info("WebSocket 세션 해제: userId={}, role={}", principal.getUserId(), principal.getRole());
    }
}
