package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.ExpressionKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpressionKeywordRepository extends JpaRepository<ExpressionKeyword, Long> {

    /** 표현 ID 목록에 해당하는 키워드 벌크 조회 (N+1 방지) */
    List<ExpressionKeyword> findByExpressionIdIn(List<Long> expressionIds);
}
