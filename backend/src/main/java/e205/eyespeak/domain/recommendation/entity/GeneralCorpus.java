package e205.eyespeak.domain.recommendation.entity;

import e205.eyespeak.global.enums.SentimentType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 전역 일반 말뭉치 (시드 데이터)
 * - 매칭/유저와 무관한 범용 표현
 * - 추천 시스템에서 50% 비중으로 활용
 * - general_sentences_with_sentiment.json 마이그레이션 대상
 */
@Entity
@Table(name = "general_corpus")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class GeneralCorpus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    private SentimentType sentiment;

    @Column(nullable = false)
    private Float weight = 1.0f;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
