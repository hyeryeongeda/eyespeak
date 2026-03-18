package e205.eyespeak.domain.routine.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

/**
 * 시간대 슬롯 (시드 데이터, 7행 고정)
 * - 기상/아침(06~09), 오전(09~12), 점심/낮(12~15), 오후(15~18),
 *   저녁(18~21), 취침준비(21~00), 야간(00~06)
 * - AUTO_INCREMENT 아님, 고정 ID 사용
 */
@Entity
@Table(name = "time_slot")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimeSlot {

    @Id
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;
}
