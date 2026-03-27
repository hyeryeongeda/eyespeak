package e205.eyespeak.global.websocket;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket 세션 저장소 — "누가 지금 온라인인가?" 를 추적
 *
 * WebSocketEventListener가 연결/해제 이벤트를 감지하여
 * 이 클래스의 addSession()/removeSessionBySessionId()을 호출한다.
 *
 * 재연결 race condition 방어:
 *   새 CONNECT가 먼저 처리되고 옛 DISCONNECT가 뒤늦게 도착하면,
 *   옛 세션의 DISCONNECT가 새 세션까지 삭제하는 문제가 있었다.
 *   userIdToSessionId(Map ③)로 "끊어진 세션이 최신 세션인지" 확인하여,
 *   최신 세션일 때만 오프라인 처리한다.
 */
@Component
public class WebSocketSessionManager {

    // Map ①: userId → StompPrincipal — "이 유저가 온라인인가?"
    private final ConcurrentHashMap<String, StompPrincipal> sessions = new ConcurrentHashMap<>();

    // Map ②: sessionId → userId — "이 세션은 누구 건가?" (DISCONNECT 시 userId 역추적용)
    private final ConcurrentHashMap<String, String> sessionIdToUserId = new ConcurrentHashMap<>();

    // Map ③: userId → sessionId — "이 유저의 최신 세션은?" (race condition 방어용)
    private final ConcurrentHashMap<String, String> userIdToSessionId = new ConcurrentHashMap<>();

    public void addSession(String userId, String sessionId, StompPrincipal principal) {
        sessions.put(userId, principal);
        userIdToSessionId.put(userId, sessionId);
        sessionIdToUserId.put(sessionId, userId);
    }

    public void removeSession(String userId) {
        String sessionId = userIdToSessionId.remove(userId);
        if (sessionId != null) {
            sessionIdToUserId.remove(sessionId);
        }
        sessions.remove(userId);
    }

    /**
     * sessionId로 세션 제거 — DISCONNECT 이벤트에서 항상 사용.
     *
     * CAS(Compare-And-Swap) 연산으로 race condition 방어:
     *   끊어진 세션이 이 유저의 최신 세션일 때만 오프라인 처리.
     *   이미 새 세션이 등록되어 있으면 오프라인 처리하지 않는다.
     */
    public void removeSessionBySessionId(String sessionId) {
        String userId = sessionIdToUserId.remove(sessionId);
        if (userId != null) {
            if (userIdToSessionId.remove(userId, sessionId)) {
                sessions.remove(userId);
            }
        }
    }

    public boolean isOnline(String userId) {
        return sessions.containsKey(userId);
    }
}
