package e205.eyespeak.global.websocket;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * [Unit 3] WebSocket 세션 저장소 — "누가 지금 온라인인가?" 를 추적
 *
 * 보호자가 채팅 화면에 있는지(WebSocket 연결) 없는지(끊김)에 따라
 * 메시지 전달 방식이 달라진다:
 *   - 온라인 → WebSocket으로 즉시 전달
 *   - 오프라인 → FCM 푸시 알림으로 전달
 *
 * WebSocketEventListener가 연결/해제 이벤트를 감지하여
 * 이 클래스의 addSession()/removeSession()을 호출한다.
 */
@Component
public class WebSocketSessionManager {

    // ConcurrentHashMap: 여러 유저가 동시에 접속/해제해도 데이터가 꼬이지 않는 안전한 Map
    // key: userId(String), value: StompPrincipal(userId, role)
    private final ConcurrentHashMap<String, StompPrincipal> sessions = new ConcurrentHashMap<>();

    public void addSession(String userId, StompPrincipal principal) {
        sessions.put(userId, principal);
    }

    public void removeSession(String userId) {
        sessions.remove(userId);
    }

    /**
     * 채팅 메시지 전송 시 이 메서드로 상대방이 온라인인지 확인하여
     * WebSocket / FCM 분기를 결정한다.
     */
    public boolean isOnline(String userId) {
        return sessions.containsKey(userId);
    }
}
