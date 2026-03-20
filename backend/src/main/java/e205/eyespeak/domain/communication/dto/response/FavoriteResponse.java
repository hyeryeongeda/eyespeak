package e205.eyespeak.domain.communication.dto.response;

import e205.eyespeak.domain.communication.entity.FavoritePhrase;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FavoriteResponse {

    @Schema(description = "즐겨찾기 ID (수정/삭제 시 사용)", example = "1")
    private Long favoriteId;
    @Schema(description = "표현 ID", example = "15")
    private Long phraseId;
    @Schema(description = "표현 내용", example = "가래 빼줘")
    private String content;
    @Schema(description = "카테고리 ID", example = "1")
    private Long categoryId;
    @Schema(description = "카테고리 이름", example = "석션 (가래/침)")
    private String categoryName;

    public static FavoriteResponse from(FavoritePhrase favoritePhrase) {
        return FavoriteResponse.builder()
                .favoriteId(favoritePhrase.getId())
                .phraseId(favoritePhrase.getPhrase().getId())
                .content(favoritePhrase.getPhrase().getContent())
                .categoryId(favoritePhrase.getPhrase().getCategory().getId())
                .categoryName(favoritePhrase.getPhrase().getCategory().getName())
                .build();
    }
}
