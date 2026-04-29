package e205.eyespeak.domain.category.dto.response;

import e205.eyespeak.domain.category.entity.Category;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 카테고리 트리 응답 DTO — 재귀 구조 (children + phrases 포함)
 * Category (카테고리)
 *  ├─ 하위 Category (children)
 *  └─ Phrase (문장들)
 */
@Getter
@Builder
public class CategoryTreeResponse {

    private Long categoryId;
    private String name;
    private Integer depth;
    private Integer orderIndex;
    private List<CategoryTreeResponse> children;
    private List<PhraseResponse> phrases;

    public static CategoryTreeResponse of(Category category,
                                          List<CategoryTreeResponse> children,
                                          List<PhraseResponse> phrases) {
        return CategoryTreeResponse.builder()
                .categoryId(category.getId())
                .name(category.getName())
                .depth(category.getDepth())
                .orderIndex(category.getOrderIndex())
                .children(children)
                .phrases(phrases)
                .build();
    }
}
