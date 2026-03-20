package e205.eyespeak.global.websocket;

import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompChannelInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT == accessor.getCommand()) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new MessagingException("Authorization 헤더가 없거나 형식이 올바르지 않습니다");
            }

            String token = authHeader.substring(7);

            if (!jwtProvider.validateToken(token)) {
                throw new MessagingException("유효하지 않은 토큰입니다");
            }

            Long userId = jwtProvider.getUserId(token);
            Role role = jwtProvider.getRole(token);

            accessor.setUser(new StompPrincipal(userId, role));
            log.info("WebSocket 연결: userId={}, role={}", userId, role);
        }

        return message;
    }
}
