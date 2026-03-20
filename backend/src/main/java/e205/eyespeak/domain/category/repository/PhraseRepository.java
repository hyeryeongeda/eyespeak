package e205.eyespeak.domain.category.repository;

import e205.eyespeak.domain.category.entity.Phrase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 표현(Phrase) Repository — 카테고리별 표현 조회용
 */
public interface PhraseRepository extends JpaRepository<Phrase, Long> {

    List<Phrase> findByCategoryIdOrderByOrderIndex(Long categoryId);

    List<Phrase> findAllByOrderByOrderIndex();
}
