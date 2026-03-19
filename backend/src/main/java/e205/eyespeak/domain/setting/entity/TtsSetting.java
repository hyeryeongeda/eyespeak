package e205.eyespeak.domain.setting.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.global.common.BaseEntity;
import e205.eyespeak.global.enums.TtsStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * TTS 설정
 * - is_enabled: TTS 활성화 여부
 * - status: NONE → TRAINING → READY/FAILED
 * - READY일 때 커스텀 음성, 그 외 기본 음성 사용
 */
@Entity
@Table(name = "tts_setting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TtsSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false, unique = true)
    private Matching matching;

    @Column(nullable = false)
    private Boolean isEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TtsStatus status = TtsStatus.NONE;

    @Builder
    public TtsSetting(Matching matching) {
        this.matching = matching;
        this.isEnabled = false;
        this.status = TtsStatus.NONE;
    }

    public void toggleEnabled() {
        this.isEnabled = !this.isEnabled;
    }

    public void updateStatus(TtsStatus status) {
        this.status = status;
    }
}
