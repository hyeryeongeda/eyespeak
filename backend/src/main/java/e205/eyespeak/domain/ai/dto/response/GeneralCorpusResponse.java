package e205.eyespeak.domain.ai.dto.response;

import e205.eyespeak.domain.recommendation.entity.GeneralCorpus;
import e205.eyespeak.global.enums.SentimentType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "범용 말뭉치 응답")
public class GeneralCorpusResponse {

    @Schema(description = "말뭉치 텍스트", example = "응, 재밌었어")
    private final String content;

    @Schema(description = "감정 유형", example = "POSITIVE")
    private final SentimentType sentiment;

    @Schema(description = "가중치", example = "1.0")
    private final Float weight;

    public static GeneralCorpusResponse from(GeneralCorpus entity) {
        return GeneralCorpusResponse.builder()
                .content(entity.getContent())
                .sentiment(entity.getSentiment())
                .weight(entity.getWeight())
                .build();
    }
}
