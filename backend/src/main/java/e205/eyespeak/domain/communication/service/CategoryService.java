package e205.eyespeak.domain.communication.service;

import e205.eyespeak.domain.communication.dto.response.CategoryResponse;
import e205.eyespeak.domain.communication.dto.response.PhraseResponse;
import e205.eyespeak.domain.communication.repository.CategoryRepository;
import e205.eyespeak.domain.communication.repository.PhraseRepository;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final PhraseRepository phraseRepository;

    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(CategoryResponse::from)
                .collect(Collectors.toList());
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
