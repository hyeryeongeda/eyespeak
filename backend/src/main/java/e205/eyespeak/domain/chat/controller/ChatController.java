package e205.eyespeak.domain.chat.controller;

import e205.eyespeak.domain.chat.dto.ChatMessageRequest;
import e205.eyespeak.domain.chat.service.ChatService;
import e205.eyespeak.global.websocket.StompPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @MessageMapping("/chat")
    public void sendMessage(ChatMessageRequest request, Principal principal) {
        StompPrincipal stomp = (StompPrincipal) principal;
        chatService.sendMessage(stomp.getUserId(), stomp.getRole(), request);
    }
}
