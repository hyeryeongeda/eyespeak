package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.GeneralCorpus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeneralCorpusRepository extends JpaRepository<GeneralCorpus, Long> {
}
