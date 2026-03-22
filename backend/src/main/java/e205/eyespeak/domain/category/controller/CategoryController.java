package e205.eyespeak.domain.category.controller;

import e205.eyespeak.domain.category.dto.response.CategoryTreeResponse;
import e205.eyespeak.domain.category.service.CategoryService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "카테고리 트리 및 표현", description = "카테고리 트리 및 표현 조회 API")
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "카테고리 트리 조회", description = "전체 카테고리를 트리 구조로 조회한다. 각 카테고리에 속한 표현(Phrase)을 포함.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공")
    })
    @GetMapping("/tree")
    public ApiResponse<List<CategoryTreeResponse>> getTree() {
        return ApiResponse.ok(categoryService.getCategoryTree());
    }
}
