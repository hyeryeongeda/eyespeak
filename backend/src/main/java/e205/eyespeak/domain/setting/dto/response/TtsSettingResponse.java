package e205.eyespeak.domain.setting.dto.response;

import e205.eyespeak.domain.setting.entity.TtsSetting;
import e205.eyespeak.domain.setting.entity.TtsVoiceFile;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class TtsSettingResponse {

    @Schema(description = "TTS 활성화 여부", example = "false")
    private Boolean isEnabled;

    @Schema(description = "TTS 상태 (NONE, READY)", example = "NONE")
    private String status;

    @Schema(description = "등록된 음성 파일 목록")
    private List<TtsVoiceFileResponse> voiceFiles;

    public static TtsSettingResponse of(TtsSetting setting, List<TtsVoiceFile> files) {
        return TtsSettingResponse.builder()
                .isEnabled(setting.getIsEnabled())
                .status(setting.getStatus().name())
                .voiceFiles(files.stream()
                        .map(TtsVoiceFileResponse::from)
                        .collect(Collectors.toList()))
                .build();
    }
}
