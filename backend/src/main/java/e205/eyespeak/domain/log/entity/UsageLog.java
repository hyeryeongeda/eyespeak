package e205.eyespeak.domain.log.entity;

import e205.eyespeak.domain.category.entity.Phrase;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.recommendation.entity.Expression;
import e205.eyespeak.domain.routine.entity.TimeSlot;
import e205.eyespeak.global.enums.MoodType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 환자 표현 사용 이력 (추천 시스템 입력 데이터)
 * - phrase_id / expr_id / content 중 하나만 값 존재
 * - time_slot_id: 의도적 비정규화 (인덱스 탐색 성능)
 * - mood: 사용 시점 환자 기분 (NULL 가능)
 */
@Entity
@Table(name = "usage_log", indexes = {
        @Index(columnList = "matching_id, used_at"),
        @Index(columnList = "matching_id, phrase_id"),
        @Index(columnList = "matching_id, expr_id"),
        @Index(columnList = "matching_id, time_slot_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phrase_id")
    private Phrase phrase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expr_id")
    private Expression expression;

    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "time_slot_id", nullable = false)
    private TimeSlot timeSlot;

    @Enumerated(EnumType.STRING)
    private MoodType moodType;

    private Integer moodLevel;

    @Column(nullable = false)
    private LocalDateTime usedAt;

    @Builder
    public UsageLog(Matching matching, Phrase phrase, Expression expression,
                    String content, TimeSlot timeSlot, MoodType moodType,
                    Integer moodLevel, LocalDateTime usedAt) {

        // phraseId / exprId / content 중 정확히 1개만 있어야 함
        int sourceCount = (phrase != null ? 1 : 0)
                + (expression != null ? 1 : 0)
                + (content != null && !content.isBlank() ? 1 : 0);
        if (sourceCount != 1) {
            throw new IllegalArgumentException(
                    "phrase, expression, content 중 정확히 1개만 값이 있어야 합니다 (현재: " + sourceCount + "개)");
        }

        // moodLevel은 1~5 범위
        if (moodLevel != null && (moodLevel < 1 || moodLevel > 5)) {
            throw new IllegalArgumentException("moodLevel은 1~5 범위여야 합니다 (현재: " + moodLevel + ")");
        }

        // moodLevel은 moodType이 있을 때만 유효
        if (moodLevel != null && moodType == null) {
            throw new IllegalArgumentException("moodLevel은 moodType이 있을 때만 설정할 수 있습니다");
        }

        this.matching = matching;
        this.phrase = phrase;
        this.expression = expression;
        this.content = content;
        this.timeSlot = timeSlot;
        this.moodType = moodType;
        this.moodLevel = moodLevel;
        this.usedAt = usedAt;
    }
}
