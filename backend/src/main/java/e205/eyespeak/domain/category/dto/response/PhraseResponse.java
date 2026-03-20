package e205.eyespeak.domain.category.dto.response;

import e205.eyespeak.domain.category.entity.Phrase;
import lombok.Builder;
import lombok.Getter;

/**
 * 표현(Phrase) 응답 DTO — 카테고리에 속하는 개별 문장
 */
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
