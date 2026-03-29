package e205.eyespeak.domain.tts.dto.request;

/**
 * TTS 음성 합성 요청 DTO
 * - 환자가 문구를 선택하면 프론트에서 텍스트를 보내고, 음성으로 변환된 결과를 받는다
 */

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "TTS 음성 합성 요청")
public class TtsSynthesizeRequest {

    @NotBlank(message = "텍스트는 필수입니다")
    @Schema(description = "음성으로 변환할 텍스트", example = "안녕하세요")
    private String text;
}
