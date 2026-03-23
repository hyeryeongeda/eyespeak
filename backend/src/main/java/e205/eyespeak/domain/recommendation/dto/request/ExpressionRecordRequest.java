package e205.eyespeak.domain.recommendation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "표현 사용 기록 요청")
public class ExpressionRecordRequest {

    @Schema(description = "사용한 표현 텍스트", example = "물 좀 줘")
    private String text;
}
