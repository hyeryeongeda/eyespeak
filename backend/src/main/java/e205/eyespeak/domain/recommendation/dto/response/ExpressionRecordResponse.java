package e205.eyespeak.domain.recommendation.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(description = "표현 사용 기록 응답")
public class ExpressionRecordResponse {

    @Schema(description = "표현 ID (채팅 전송 시 사용)", example = "5")
    private final Long expressionId;

    @Schema(description = "신규 표현 여부", example = "true")
    private final boolean isNew;
}
