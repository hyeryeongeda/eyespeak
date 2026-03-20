package e205.eyespeak.domain.setting.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Dwell Time 변경 요청")
public class DwellTimeUpdateRequest {

    @NotNull(message = "dwellTime은 필수입니다")
    @Schema(description = "Dwell Time (ms). 허용값: 600(짧게), 1000(기본)", example = "1000")
    private Integer dwellTime;
}
