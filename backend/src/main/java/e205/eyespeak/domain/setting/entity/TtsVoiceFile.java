package e205.eyespeak.domain.setting.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * TTS 학습용 음성 파일
 * - 보호자가 업로드한 음성 샘플
 * - S3 등 외부 저장소 경로 참조
 */
@Entity
@Table(name = "tts_voice_file")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class TtsVoiceFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tts_setting_id", nullable = false)
    private TtsSetting ttsSetting;

    @Column(nullable = false)
    private String fileUrl;

    @Column(nullable = false)
    private String fileName;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public TtsVoiceFile(TtsSetting ttsSetting, String fileUrl, String fileName) {
        this.ttsSetting = ttsSetting;
        this.fileUrl = fileUrl;
        this.fileName = fileName;
    }
}
