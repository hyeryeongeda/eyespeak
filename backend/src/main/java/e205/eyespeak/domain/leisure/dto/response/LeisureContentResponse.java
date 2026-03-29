package e205.eyespeak.domain.leisure.dto.response;

import e205.eyespeak.domain.leisure.constant.YoutubeCategory;
import e205.eyespeak.domain.leisure.entity.LeisureContent;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LeisureContentResponse {

    private Long id;
    private String name;
    private String url;
    private String category;
    private String categoryName;

    public static LeisureContentResponse from(LeisureContent content) {
        return LeisureContentResponse.builder()
                .id(content.getId())
                .name(content.getName())
                .url(content.getUrl())
                .category(content.getCategory())
                .categoryName(content.getCategory() != null
                        ? YoutubeCategory.getName(content.getCategory())
                        : null)
                .build();
    }
}
