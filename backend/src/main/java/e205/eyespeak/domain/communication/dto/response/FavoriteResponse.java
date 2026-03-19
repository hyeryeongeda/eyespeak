package e205.eyespeak.domain.communication.dto.response;

import e205.eyespeak.domain.communication.entity.FavoritePhrase;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FavoriteResponse {

    private Long favoriteId;
    private Long phraseId;
    private String content;
    private Long categoryId;
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
