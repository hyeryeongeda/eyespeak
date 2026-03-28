package e205.eyespeak.domain.recommendation.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 맞춤 표현 키워드 (추천 시스템 검색용)
 * - Expression에서 추출한 키워드
 * - VARCHAR 파싱보다 인덱스 탐색이 빠름
 */
@Entity
@Table(name = "expression_keywords", indexes = {
        @Index(columnList = "expr_id"),
        @Index(columnList = "keyword")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExpressionKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expr_id", nullable = false)
    private Expression expression;

    @Column(nullable = false)
    private String keyword;

    @Builder
    public ExpressionKeyword(Expression expression, String keyword) {
        this.expression = expression;
        this.keyword = keyword;
    }
}
