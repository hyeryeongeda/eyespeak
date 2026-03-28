package e205.eyespeak.domain.tts.dto.response;

/**
 * TTS 음성 합성 응답 DTO
 * - AI TTS 서버가 생성한 음성 데이터를 프론트에 전달
 * - 프론트에서 audioBase64를 디코딩하여 브라우저에서 재생
 */

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "TTS 음성 합성 응답")
public class TtsSynthesizeResponse {

    @Schema(description = "base64 인코딩된 WAV 음성 데이터", example = "UklGRi...")
    private String audioBase64;

    @Schema(description = "샘플레이트 (Hz)", example = "24000")
    private int sampleRate;

    @Schema(description = "AI 서버 캐시 히트 여부 (같은 텍스트 반복 시 true)", example = "false")
    private boolean cached;
}
