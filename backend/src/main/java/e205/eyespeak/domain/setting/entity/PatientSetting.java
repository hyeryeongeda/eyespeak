package e205.eyespeak.domain.setting.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 환자 시선 입력 설정
 * - activation_delay: 새 화면 진입 후 gaze 인식 차단 시간 (ms)
 * - dwell_time: 선택 인식 최소 응시 시간 (ms)
 * - 보호자가 조절
 */
@Entity
@Table(name = "patient_setting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PatientSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false, unique = true)
    private Matching matching;

    @Column(nullable = false)
    private Integer activationDelay;

    @Column(nullable = false)
    private Integer dwellTime;

    @Builder
    public PatientSetting(Matching matching, Integer activationDelay, Integer dwellTime) {
        this.matching = matching;
        this.activationDelay = activationDelay;
        this.dwellTime = dwellTime;
    }

    public void updateActivationDelay(int activationDelay) {
        this.activationDelay = activationDelay;
    }

    public void updateDwellTime(int dwellTime) {
        this.dwellTime = dwellTime;
    }
}
