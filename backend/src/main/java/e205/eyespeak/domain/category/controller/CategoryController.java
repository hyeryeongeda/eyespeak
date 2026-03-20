package e205.eyespeak.domain.category.controller;

import e205.eyespeak.domain.category.service.CategoryService;
import e205.eyespeak.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 카테고리 API — 시드 데이터 기반 표현 분류 트리 조회
 */
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/tree")
    public ApiResponse<?> getTree() {
        return ApiResponse.ok(categoryService.getCategoryTree());
    }
}
