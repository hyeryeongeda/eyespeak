package e205.eyespeak.domain.communication.controller;

import e205.eyespeak.domain.communication.dto.response.CategoryResponse;
import e205.eyespeak.domain.communication.dto.response.PhraseResponse;
import e205.eyespeak.domain.communication.service.CategoryService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 카테고리 + 문구 API
 * - /tree: 기존 Swagger 명세용 트리 조회
 * - /: 카테고리 목록 조회
 * - /{categoryId}/phrases: 카테고리별 표현 조회
 */
@Tag(name = "카테고리 (몸과마음)", description = "카테고리 + 문구 조회 API")
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "카테고리 목록 조회", description = "전체 카테고리 목록을 조회한다.")
    @GetMapping
    public ApiResponse<List<CategoryResponse>> getCategories() {
        List<CategoryResponse> response = categoryService.getCategories();
        return ApiResponse.ok(response);
    }

    @Operation(summary = "카테고리별 표현 조회", description = "해당 카테고리의 표현 목록을 조회한다.")
    @GetMapping("/{categoryId}/phrases")
    public ApiResponse<List<PhraseResponse>> getPhrasesByCategory(@PathVariable Long categoryId) {
        List<PhraseResponse> response = categoryService.getPhrasesByCategory(categoryId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "카테고리 + 문구 트리 전체 조회",
            description = "몸과마음 카테고리 계층(depth 0→1→2) + 말단 문구를 트리 구조로 한번에 조회. "
                    + "시드 데이터라 양이 적으므로 전체 반환, 프론트에서 depth별 화면 전환")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping("/tree")
    public ApiResponse<List<CategoryTreeResponse>> getTree() {
        List<CategoryTreeResponse> tree = List.of(
                new CategoryTreeResponse(1L, "가래/침 빼줘", 0, 1,
                        List.of(
                                new CategoryTreeResponse(10L, "가래 빼줘", 1, 1, List.of(),
                                        List.of(new TreePhraseResponse(101L, "가래 빼줘", 1))),
                                new CategoryTreeResponse(11L, "침 빼줘", 1, 2, List.of(),
                                        List.of(new TreePhraseResponse(102L, "침 빼줘", 1)))
                        ),
                        List.of()),
                new CategoryTreeResponse(2L, "숨 답답해", 0, 2, List.of(),
                        List.of(new TreePhraseResponse(201L, "숨이 답답해요", 1)))
        );
        return ApiResponse.ok(tree);
    }

    @Getter
    @Schema(description = "카테고리 트리 응답")
    static class CategoryTreeResponse {
        @Schema(description = "카테고리 ID", example = "1")
        private final Long categoryId;

        @Schema(description = "카테고리명", example = "가래/침 빼줘")
        private final String name;

        @Schema(description = "계층 (0=최상위, 1=중간, 2=말단)", example = "0")
        private final int depth;

        @Schema(description = "표시 순서", example = "1")
        private final int orderIndex;

        @Schema(description = "하위 카테고리 (재귀)")
        private final List<CategoryTreeResponse> children;

        @Schema(description = "해당 카테고리의 문구 목록 (말단에만 존재)")
        private final List<TreePhraseResponse> phrases;

        CategoryTreeResponse(Long categoryId, String name, int depth, int orderIndex,
                             List<CategoryTreeResponse> children, List<TreePhraseResponse> phrases) {
            this.categoryId = categoryId;
            this.name = name;
            this.depth = depth;
            this.orderIndex = orderIndex;
            this.children = children;
            this.phrases = phrases;
        }
    }

    @Getter
    @Schema(description = "문구 응답")
    static class TreePhraseResponse {
        @Schema(description = "문구 ID", example = "101")
        private final Long phraseId;

        @Schema(description = "문구 내용", example = "가래 빼줘")
        private final String content;

        @Schema(description = "문구 표시 순서", example = "1")
        private final int orderIndex;

        TreePhraseResponse(Long phraseId, String content, int orderIndex) {
            this.phraseId = phraseId;
            this.content = content;
            this.orderIndex = orderIndex;
        }
    }
}
