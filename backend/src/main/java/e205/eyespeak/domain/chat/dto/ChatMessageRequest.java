package e205.eyespeak.domain.chat.dto;

import e205.eyespeak.global.enums.ContentType;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatMessageRequest {

    private Long matchingId;
    private ContentType contentType;
    private String text;
    private Long phraseId;
    private Long expressionId;
}
