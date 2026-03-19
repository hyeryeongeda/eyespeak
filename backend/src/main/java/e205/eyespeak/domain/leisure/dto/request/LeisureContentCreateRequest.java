package e205.eyespeak.domain.leisure.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LeisureContentCreateRequest {

    @NotBlank(message = "콘텐츠 이름은 필수입니다")
    @Schema(description = "콘텐츠 이름", example = "힐링 음악 모음")
    private String name;

    @Schema(description = "YouTube URL (카테고리와 동시 입력 불가)", example = "https://www.youtube.com/watch?v=abc123")
    private String url;

    @Schema(description = "카테고리 (URL과 동시 입력 불가). sports / news / music / radio / audiobook 중 택 1",
            example = "music")
    private String category;
}
