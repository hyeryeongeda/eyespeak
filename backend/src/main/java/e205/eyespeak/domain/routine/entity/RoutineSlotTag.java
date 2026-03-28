package e205.eyespeak.domain.routine.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 매칭별 루틴 선택 (하나의 시간대에 활동 태그 1개)
 * - matching_id + time_slot_id 조합이 유니크
 */
@Entity
@Table(name = "routine_slot_tag", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"matching_id", "time_slot_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class RoutineSlotTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "time_slot_id", nullable = false)
    private TimeSlot timeSlot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_tag_id", nullable = false)
    private ActivityTag activityTag;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public RoutineSlotTag(Matching matching, TimeSlot timeSlot, ActivityTag activityTag) {
        this.matching = matching;
        this.timeSlot = timeSlot;
        this.activityTag = activityTag;
    }
}
