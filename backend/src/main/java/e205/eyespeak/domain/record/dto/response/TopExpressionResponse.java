package e205.eyespeak.domain.record.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TopExpressionResponse {

    @Schema(description = "순위 (1~5)", example = "1")
    private int rank;

    @Schema(description = "표현 내용", example = "물 마시고 싶어")
    private String content;

    @Schema(description = "사용 횟수", example = "8")
    private long count;
}
