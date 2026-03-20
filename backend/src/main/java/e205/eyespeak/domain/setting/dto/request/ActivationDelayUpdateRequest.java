package e205.eyespeak.domain.setting.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "입력 잠금 시간 변경 요청")
public class ActivationDelayUpdateRequest {

    @NotNull(message = "activationDelay는 필수입니다")
    @Schema(description = "입력 잠금 시간 (ms). 허용값: 0(없음), 600(짧게), 1000(중간), 1600(길게)", example = "1000")
    private Integer activationDelay;
}
