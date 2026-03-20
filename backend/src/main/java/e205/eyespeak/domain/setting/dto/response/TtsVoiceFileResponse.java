package e205.eyespeak.domain.setting.dto.response;

import e205.eyespeak.domain.setting.entity.TtsVoiceFile;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class TtsVoiceFileResponse {

    @Schema(description = "음성 파일 ID", example = "1")
    private Long id;

    @Schema(description = "원본 파일명", example = "patient_voice.mp3")
    private String fileName;

    @Schema(description = "저장 경로", example = "tts/1/a1b2c3d4_patient_voice.mp3")
    private String fileUrl;

    @Schema(description = "등록 일시", example = "2026-03-20T10:30:00")
    private LocalDateTime createdAt;

    public static TtsVoiceFileResponse from(TtsVoiceFile file) {
        return TtsVoiceFileResponse.builder()
                .id(file.getId())
                .fileName(file.getFileName())
                .fileUrl(file.getFileUrl())
                .createdAt(file.getCreatedAt())
                .build();
    }
}
