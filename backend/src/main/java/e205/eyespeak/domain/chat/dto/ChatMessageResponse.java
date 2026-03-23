package e205.eyespeak.domain.chat.dto;

import e205.eyespeak.domain.communication.entity.Message;
import e205.eyespeak.global.enums.ContentType;
import e205.eyespeak.global.enums.Role;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * [Unit 4] 서버가 /user/queue/chat 으로 보내는 데이터 그릇 (Response DTO)
 *
 * Message 엔티티를 그대로 보내면 불필요한 정보(inviteCode 등)가 노출되므로,
 * 프론트에 필요한 필드만 골라서 담는다.
 */
@Getter
@Builder
public class ChatMessageResponse {

    private Long messageId;
    private Long matchingId;
    // senderId = userId. DB(Message 엔티티)에는 이 컬럼이 없고 matching + senderRole로 발신자를 특정하지만,
    // 프론트가 매번 "이 매칭의 PATIENT가 누구지?" 조회하는 건 비효율적이므로 서버에서 미리 넣어준다.
    private Long senderId;
    private Role senderRole;
    private ContentType contentType;
    private String text;
    private LocalDateTime createdAt;

    /** Message 엔티티 → Response DTO 변환. senderId는 엔티티에 없으므로 파라미터로 받는다. */
    public static ChatMessageResponse from(Message message, Long senderId) {
        return ChatMessageResponse.builder()
                .messageId(message.getId())
                .matchingId(message.getMatching().getId())
                .senderId(senderId)
                .senderRole(message.getSenderRole())
                .contentType(message.getContentType())
                .text(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
