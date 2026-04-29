package e205.eyespeak.domain.tts.controller;

/**
 * TTS 음성 합성 API — 환자가 문구를 선택하면 음성으로 변환하여 반환
 * - 보호자용 TTS 설정(TtsController)과 분리된 환자용 합성 전용 컨트롤러
 */

import e205.eyespeak.domain.tts.dto.request.TtsSynthesizeRequest;
import e205.eyespeak.domain.tts.dto.response.TtsSynthesizeResponse;
import e205.eyespeak.domain.tts.service.TtsSynthesizeService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "TTS 음성 합성", description = "환자 문구 선택 시 음성으로 변환하는 API")
@RestController
@RequestMapping("/tts")
@RequiredArgsConstructor
public class TtsSynthesizeController {

    private final TtsSynthesizeService ttsSynthesizeService;

    @Operation(
            summary = "TTS 음성 합성 요청",
            description = """
                    텍스트를 환자 맞춤 음성으로 변환하여 반환합니다.

                    TTS 설정이 ON일 때만 호출하세요.
                    AI TTS 서버가 환자 음성 모델로 합성하며, 같은 텍스트 반복 시 캐시되어 빠르게 응답합니다.

                    **프론트 재생 예시:**
                    ```javascript
                    const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
                    audio.play();
                    ```
                    """
    )
    @PostMapping("/synthesize")
    public ApiResponse<TtsSynthesizeResponse> synthesize(
            @Valid @RequestBody TtsSynthesizeRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        TtsSynthesizeResponse response = ttsSynthesizeService.synthesize(userId, request.getText());
        return ApiResponse.ok(response);
    }
}
