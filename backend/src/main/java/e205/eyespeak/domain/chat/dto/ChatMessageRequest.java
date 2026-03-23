package e205.eyespeak.domain.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import e205.eyespeak.global.enums.ContentType;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * [Unit 4] 클라이언트가 /app/chat 으로 STOMP SEND할 때 보내는 데이터 그릇 (Request DTO)
 *
 * contentType에 따라 사용하는 필드가 다르다:
 *   TEXT       → text 필수, phraseId/expressionId 불필요
 *   PHRASE     → phraseId 필수 (서버가 Phrase.content를 조회하여 text를 채움)
 *   EXPRESSION → expressionId 필수 (서버가 Expression.content를 조회하여 text를 채움)
 *
 * @NoArgsConstructor: Spring이 JSON을 이 객체로 변환할 때,
 * 먼저 빈 객체를 만들고(1단계) → JSON 값을 필드에 채워넣는다(2단계).
 * 그래서 파라미터 없는 기본 생성자가 필요하다.
 */
@Getter
@NoArgsConstructor
public class ChatMessageRequest {

    private Long matchingId;
    private ContentType contentType;
    private String text;
    private Long phraseId;
    @JsonProperty("exprId")
    private Long expressionId;
}
