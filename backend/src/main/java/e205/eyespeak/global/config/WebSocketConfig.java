package e205.eyespeak.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

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
}
