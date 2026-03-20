package e205.eyespeak.global.websocket;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionManager {

    private final ConcurrentHashMap<String, StompPrincipal> sessions = new ConcurrentHashMap<>();

    public void addSession(String userId, StompPrincipal principal) {
        sessions.put(userId, principal);
    }

    public void removeSession(String userId) {
        sessions.remove(userId);
    }

    public boolean isOnline(String userId) {
        return sessions.containsKey(userId);
    }
}
