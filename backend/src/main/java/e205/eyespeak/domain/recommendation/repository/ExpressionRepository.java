package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.Expression;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpressionRepository extends JpaRepository<Expression, Long> {
}
