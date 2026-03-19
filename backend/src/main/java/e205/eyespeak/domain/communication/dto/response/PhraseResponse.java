package e205.eyespeak.domain.communication.dto.response;

import e205.eyespeak.domain.communication.entity.Phrase;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PhraseResponse {

    private Long phraseId;
    private String content;
    private Integer orderIndex;

    public static PhraseResponse from(Phrase phrase) {
        return PhraseResponse.builder()
                .phraseId(phrase.getId())
                .content(phrase.getContent())
                .orderIndex(phrase.getOrderIndex())
                .build();
    }
}
