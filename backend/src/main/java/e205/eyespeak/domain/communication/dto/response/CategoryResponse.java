package e205.eyespeak.domain.communication.dto.response;

import e205.eyespeak.domain.communication.entity.Category;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CategoryResponse {

    private Long categoryId;
    private String name;
    private Integer orderIndex;

    public static CategoryResponse from(Category category) {
        return CategoryResponse.builder()
                .categoryId(category.getId())
                .name(category.getName())
                .orderIndex(category.getOrderIndex())
                .build();
    }
}
