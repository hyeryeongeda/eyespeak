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

/**
 * [Unit 2] STOMP 메시지의 JWT 인증 인터셉터 (WebSocket 버전의 JwtFilter)
 *
 * REST API에서는 JwtFilter가 HTTP 요청마다 토큰을 검증하지만,
 * WebSocket 핸드셰이크 이후의 STOMP 메시지는 HTTP가 아니라 JwtFilter가 못 잡는다.
 * 그래서 ClientInboundChannel(클라이언트→서버 다리)에 이 인터셉터를 등록하여,
 * STOMP CONNECT 프레임에서 JWT를 검증한다.
 *
 * <인증 흐름>
 *   클라이언트 CONNECT (Authorization: Bearer {jwt})
 *     → preSend()에서 가로챔
 *     → JwtProvider로 토큰 검증 + userId/role 추출
 *     → StompPrincipal 생성 후 연결에 세팅
 *     → 이후 모든 메시지에 Principal이 자동으로 따라다님
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompChannelInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;

    /**
     * preSend = 메시지가 컨트롤러에 전달되기 전(pre)에 실행되는 메서드.
     * CONNECT일 때만 인증 처리하고, 이후 SEND/SUBSCRIBE 등은 그냥 통과시킨다.
     * (CONNECT에서 한 번 인증하면 Principal이 세팅되어 이후 메시지에 자동 전파됨)
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT == accessor.getCommand()) {
            // STOMP CONNECT 프레임의 native header에서 Authorization 값을 꺼냄
            // (HTTP 헤더가 아니라 STOMP 프레임 자체의 커스텀 헤더)
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new MessagingException("Authorization 헤더가 없거나 형식이 올바르지 않습니다");
            }

            // "Bearer eyJxxx..." 에서 "Bearer " (7글자)를 떼고 토큰만 추출
            String token = authHeader.substring(7);

            if (!jwtProvider.validateToken(token)) {
                throw new MessagingException("유효하지 않은 토큰입니다");
            }

            // 기존 JwtProvider를 그대로 재사용하여 userId, role 추출
            Long userId = jwtProvider.getUserId(token);
            Role role = jwtProvider.getRole(token);

            // 이 연결에 "신분증"을 붙여놓음 → 이후 모든 메시지에 따라다님
            accessor.setUser(new StompPrincipal(userId, role));
            log.info("WebSocket 연결: userId={}, role={}", userId, role);
        }

        return message;
    }
}
