package e205.eyespeak.domain.setting.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(description = "입력 잠금 시간 응답")
public class ActivationDelayResponse {

    @Schema(description = "입력 잠금 시간 (ms)", example = "1000")
    private int activationDelay;

    @Schema(description = "프리셋 라벨", example = "중간")
    private String label;
}
