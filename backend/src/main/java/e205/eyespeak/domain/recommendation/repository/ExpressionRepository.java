package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.Expression;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExpressionRepository extends JpaRepository<Expression, Long> {

    /** 매칭별 전체 표현 조회 (AI user-context API용) */
    List<Expression> findByMatchingId(Long matchingId);

    /** 매칭 + 내용으로 기존 표현 확인 (중복 체크용) */
    Optional<Expression> findByMatchingIdAndContent(Long matchingId, String content);
}
