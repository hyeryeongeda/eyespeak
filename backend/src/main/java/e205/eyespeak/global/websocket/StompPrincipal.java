package e205.eyespeak.global.websocket;

import e205.eyespeak.global.enums.Role;
import lombok.Getter;

import java.security.Principal;

/**
 * [Unit 2] WebSocket 연결의 "신분증"
 *
 * Principal = "현재 인증된 사용자가 누구인가"를 표현하는 Java 인터페이스.
 * REST API에서는 Spring Security가 알아서 만들어주지만,
 * WebSocket에서는 직접 만들어야 한다 (StompChannelInterceptor에서 생성).
 *
 * STOMP CONNECT 시 JWT에서 추출한 userId와 role을 담고 있으며,
 * 이후 이 연결에서 오는 모든 STOMP 메시지에 자동으로 따라다닌다.
 */
@Getter
public class StompPrincipal implements Principal {

    private final Long userId;
    private final Role role;

    public StompPrincipal(Long userId, Role role) {
        this.userId = userId;
        this.role = role;
    }

    /**
     * convertAndSendToUser("42", "/queue/chat", msg) 호출 시,
     * Spring이 연결된 세션들의 Principal.getName()과 "42"를 비교하여 대상을 찾는다.
     * 그래서 userId를 String으로 반환해야 한다.
     */
    @Override
    public String getName() {
        return String.valueOf(userId);
    }
}
