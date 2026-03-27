package e205.eyespeak.global.config;

import e205.eyespeak.global.websocket.StompChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket STOMP 브로커 설정
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
        // heartbeat: 서버↔클라이언트 간 10초마다 "살아있음" 신호 교환
        //   - 비정상 종료(네트워크 끊김 등)를 빠르게 감지하여 SimpUserRegistry에서 세션 제거
        //   - setTaskScheduler 없으면 heartbeat이 동작하지 않음
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(brokerTaskScheduler());
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
     * ClientInboundChannel = 클라이언트 → 서버 방향의 모든 STOMP 메시지가 지나가는 통로.
     * 이 다리에 인터셉터를 등록하면, 메시지가 컨트롤러에 도달하기 전에 가로챌 수 있다.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompChannelInterceptor);
    }

    /**
     * heartbeat 전송을 위한 TaskScheduler.
     * setHeartbeatValue()만 설정하고 이걸 빠뜨리면 heartbeat이 동작하지 않는다.
     */
    private TaskScheduler brokerTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }
}
