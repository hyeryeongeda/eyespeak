package e205.eyespeak.global.config;

import e205.eyespeak.global.websocket.StompChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * [Unit 1, 2] WebSocket STOMP 브로커 설정
 *
 * WebSocket 위에서 STOMP 프로토콜을 사용하여 실시간 메시징을 처리한다.
 * HTTP는 요청-응답 후 연결이 끊기지만, WebSocket은 연결을 유지하여 양방향 통신이 가능하다.
 * STOMP는 WebSocket 위에서 구독/발행 패턴을 표준화한 메시징 프로토콜이다.
 *
 * <전체 STOMP 채널 구조>
 *   /ws                                ← WebSocket 핸드셰이크 엔드포인트 (최초 연결)
 *   /app/chat                          ← 클라이언트가 메시지를 보내는 곳 (SEND)
 *   /user/queue/chat                   ← 1:1 채팅 메시지 수신 (개인 큐)
 *   /user/queue/call                   ← 호출 확인 알림 수신 (환자용, 개인 큐)
 *   /user/queue/errors                 ← STOMP 에러 수신 (개인 큐)
 *   /topic/matching/{matchingId}/call  ← 호출/SOS 브로드캐스트 (보호자용)
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompChannelInterceptor stompChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 구독 prefix: /topic (브로드캐스트), /queue (개인)
        registry.enableSimpleBroker("/topic", "/queue");
        // 클라이언트가 메시지를 보내는 prefix
        registry.setApplicationDestinationPrefixes("/app");
        // 특정 유저에게 보내는 prefix
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket 핸드셰이크 엔드포인트
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    /**
     * ClientInboundChannel = 클라이언트 → 서버 방향의 모든 STOMP 메시지가 지나가는 통로(다리).
     * 이 다리에 인터셉터를 등록하면, 메시지가 컨트롤러에 도달하기 전에 가로챌 수 있다.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompChannelInterceptor);
    }
}
