package e205.eyespeak.domain.category.service;

import e205.eyespeak.domain.category.dto.response.CategoryTreeResponse;
import e205.eyespeak.domain.category.dto.response.PhraseResponse;
import e205.eyespeak.domain.category.entity.Category;
import e205.eyespeak.domain.category.entity.Phrase;
import e205.eyespeak.domain.category.repository.CategoryRepository;
import e205.eyespeak.domain.category.repository.PhraseRepository;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 카테고리 서비스 — 카테고리 트리 조립 및 Phrase 조회
 * 시드 데이터(카테고리 11개, 표현 77개)를 트리 구조로 반환
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final PhraseRepository phraseRepository;

    public List<CategoryTreeResponse> getCategoryTree() {
        List<Category> categories = categoryRepository.findAllByOrderByDepthAscOrderIndexAsc();
        List<Phrase> phrases = phraseRepository.findAllByOrderByOrderIndex();

        // categoryId → phrases 그룹핑
        Map<Long, List<PhraseResponse>> phraseMap = phrases.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getCategory().getId(),
                        Collectors.mapping(PhraseResponse::from, Collectors.toList())
                ));

        // parentId → children 그룹핑
        Map<Long, List<Category>> childrenMap = categories.stream()
                .filter(c -> c.getParent() != null)
                .collect(Collectors.groupingBy(c -> c.getParent().getId()));

        // depth=0(최상위)부터 재귀 조립
        return categories.stream()
                .filter(c -> c.getParent() == null)
                .map(c -> buildTree(c, childrenMap, phraseMap))
                .collect(Collectors.toList());
    }

    private CategoryTreeResponse buildTree(Category category,
                                           Map<Long, List<Category>> childrenMap,
                                           Map<Long, List<PhraseResponse>> phraseMap) {
        List<CategoryTreeResponse> children = childrenMap
                .getOrDefault(category.getId(), Collections.emptyList())
                .stream()
                .map(c -> buildTree(c, childrenMap, phraseMap))
                .collect(Collectors.toList());

        List<PhraseResponse> phrases = phraseMap
                .getOrDefault(category.getId(), Collections.emptyList());

        return CategoryTreeResponse.of(category, children, phrases);
    }

    public List<PhraseResponse> getPhrasesByCategory(Long categoryId) {
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CATEGORY_NOT_FOUND));

        return phraseRepository.findByCategoryIdOrderByOrderIndex(categoryId)
                .stream()
                .map(PhraseResponse::from)
                .collect(Collectors.toList());
    }
}
