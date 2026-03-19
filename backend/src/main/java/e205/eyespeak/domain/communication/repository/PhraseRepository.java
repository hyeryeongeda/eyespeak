package e205.eyespeak.domain.communication.repository;

import e205.eyespeak.domain.communication.entity.Phrase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhraseRepository extends JpaRepository<Phrase, Long> {

    List<Phrase> findByCategoryIdOrderByOrderIndex(Long categoryId);
}
