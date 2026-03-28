package e205.eyespeak.global.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Component;

/**
 * WebSocket 온라인 상태 판별기
 *
 * Spring이 내부적으로 관리하는 SimpUserRegistry에 위임하여
 * 유저의 온라인/오프라인 상태를 판별한다.
 *
 * 기존에는 ConcurrentHashMap 3개를 직접 관리했으나,
 * 수동 세션 관리로 인해 재연결 race condition과
 * 단기 세션 즉시 종료 시 메시지 유실 버그가 발생했다.
 *
 * SimpUserRegistry는 Spring이 SessionConnectedEvent/SessionDisconnectEvent를
 * 통해 자동으로 세션을 추적하며, 유저당 여러 세션을 Set으로 관리하여
 * 모든 세션이 끊어졌을 때만 오프라인으로 판별한다.
 */
@Component
@RequiredArgsConstructor
public class WebSocketSessionManager {

    private final SimpUserRegistry simpUserRegistry;

    /**
     * 유저가 현재 WebSocket에 연결되어 있는지 확인한다.
     * SimpUserRegistry에 해당 유저가 존재하고, 활성 세션이 1개 이상이면 온라인.
     */
    public boolean isOnline(String userId) {
        var user = simpUserRegistry.getUser(userId);
        return user != null && !user.getSessions().isEmpty();
    }
}
