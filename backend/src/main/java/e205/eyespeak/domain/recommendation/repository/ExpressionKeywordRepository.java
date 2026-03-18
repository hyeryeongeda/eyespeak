package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.ExpressionKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpressionKeywordRepository extends JpaRepository<ExpressionKeyword, Long> {
}
