package e205.eyespeak.domain.chat.dto;

import e205.eyespeak.domain.communication.entity.Message;
import e205.eyespeak.global.enums.ContentType;
import e205.eyespeak.global.enums.Role;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatMessageResponse {

    private Long messageId;
    private Long matchingId;
    private Long senderId;
    private Role senderRole;
    private ContentType contentType;
    private String text;
    private LocalDateTime timestamp;

    public static ChatMessageResponse from(Message message, Long senderId) {
        return ChatMessageResponse.builder()
                .messageId(message.getId())
                .matchingId(message.getMatching().getId())
                .senderId(senderId)
                .senderRole(message.getSenderRole())
                .contentType(message.getContentType())
                .text(message.getContent())
                .timestamp(message.getCreatedAt())
                .build();
    }
}
