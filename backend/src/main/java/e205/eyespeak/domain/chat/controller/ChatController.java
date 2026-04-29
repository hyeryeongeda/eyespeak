package e205.eyespeak.domain.chat.controller;

import e205.eyespeak.domain.chat.dto.ChatMessageRequest;
import e205.eyespeak.domain.chat.service.ChatService;
import e205.eyespeak.global.websocket.StompPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * [Unit 4] 채팅 STOMP 핸들러
 *
 * REST 컨트롤러(@RestController)와의 차이:
 *   - @Controller 사용 (HTTP 응답을 자동 직렬화하는 @RestController가 아님)
 *   - @MessageMapping 사용 (@PostMapping 대신)
 *   - Principal 파라미터로 인증 정보 접근 (Authentication 대신)
 *
 * 클라이언트가 /app/chat 으로 STOMP SEND → 이 컨트롤러가 받아서 서비스에 위임
 */
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * @MessageMapping("/chat") → 클라이언트가 /app/chat 으로 SEND한 메시지를 처리
     * ("/app"은 WebSocketConfig에서 설정한 ApplicationDestinationPrefix)
     *
     * Principal: StompChannelInterceptor에서 CONNECT 시 세팅한 StompPrincipal.
     * REST의 Authentication과 역할이 같지만, STOMP에서는 Principal을 사용한다.
     */
    @MessageMapping("/chat")
    public void sendMessage(ChatMessageRequest request, Principal principal) {
        StompPrincipal stomp = (StompPrincipal) principal;
        chatService.sendMessage(stomp.getUserId(), stomp.getRole(), request);
    }
}
