package e205.eyespeak.domain.recommendation.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.global.enums.SentimentType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 맞춤 표현 (유저 데이터 — Phrase 시드와 구분)
 * - 환자가 만든 개인화 표현
 * - INSERT-only (수정 없음), last_used만 갱신
 * - 추천 시스템에서 활용
 */
@Entity
@Table(name = "expressions", indexes = {
        @Index(columnList = "matching_id, last_used"),
        @Index(columnList = "matching_id, category")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Expression {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @Column(nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    private SentimentType sentiment;

    private String category;

    private LocalDateTime lastUsed;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Expression(Matching matching, String content, SentimentType sentiment, String category) {
        this.matching = matching;
        this.content = content;
        this.sentiment = sentiment;
        this.category = category;
    }

    /** 마지막 사용 시각 갱신 (표현 재사용 시 호출) */
    public void updateLastUsed(LocalDateTime time) {
        this.lastUsed = time;
    }
}
