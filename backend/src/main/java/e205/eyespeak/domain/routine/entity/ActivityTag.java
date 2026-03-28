package e205.eyespeak.domain.routine.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 활동 태그 (시드 데이터, 11행 고정)
 * - 경관식/수분섭취, 약물투여, 구강케어, 체위변경, 흡인/호흡케어,
 *   배변/배뇨케어, 재활/ROM운동, 세면/위생, 영상시청, 외부인방문, 휴식/수면
 * - AUTO_INCREMENT 아님, 고정 ID 사용
 */
@Entity
@Table(name = "activity_tag")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActivityTag {

    @Id
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer orderIndex;
}
