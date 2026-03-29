package e205.eyespeak.domain.recommendation.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.global.enums.MoodType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 환자 일일 기분 기록
 * - 하루에 기분 기록 1개 (matching_id + mood_date 유니크)
 * - 환자 앱 첫 사용 시 기분 선택
 * - 추천 로직 입력 + 보호자 캘린더 날짜별 기분 조회용
 */
@Entity
@Table(name = "daily_mood", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"matching_id", "mood_date"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class DailyMood {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @Column(nullable = false)
    private LocalDate moodDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MoodType moodType;

    @Column(nullable = false)
    private Integer moodLevel;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public DailyMood(Matching matching, LocalDate moodDate, MoodType moodType, Integer moodLevel) {
        this.matching = matching;
        this.moodDate = moodDate;
        this.moodType = moodType;
        this.moodLevel = moodLevel;
    }
}
