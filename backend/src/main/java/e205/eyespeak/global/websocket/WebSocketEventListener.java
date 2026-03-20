package e205.eyespeak.global.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * [Unit 3] WebSocket 연결/해제 이벤트 감지기
 *
 * Spring이 WebSocket 연결/해제 시 자동으로 이벤트를 발생시키는데,
 * @EventListener가 붙은 메서드를 Spring이 자동으로 호출해준다.
 * (직접 호출하는 코드가 없어도 Spring이 이벤트 발생 시 알아서 실행)
 *
 *   STOMP CONNECT 성공 → SessionConnectEvent → handleConnect() 호출
 *   STOMP DISCONNECT   → SessionDisconnectEvent → handleDisconnect() 호출
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final WebSocketSessionManager sessionManager;

    /** WebSocket 연결 시 세션 저장소에 유저 등록 */
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

    /** WebSocket 해제 시 세션 저장소에서 유저 제거 (브라우저 종료, 네트워크 끊김 포함) */
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
