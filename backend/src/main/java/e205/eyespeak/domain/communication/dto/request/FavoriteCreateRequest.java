package e205.eyespeak.domain.communication.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FavoriteCreateRequest {

    @Schema(description = "즐겨찾기에 추가할 표현 ID (카테고리별 표현 조회 응답의 phraseId)", example = "1")
    @NotNull(message = "표현 ID는 필수입니다")
    private Long phraseId;
}
