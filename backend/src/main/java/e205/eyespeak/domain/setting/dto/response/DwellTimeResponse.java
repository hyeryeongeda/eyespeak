package e205.eyespeak.domain.setting.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(description = "Dwell Time 응답")
public class DwellTimeResponse {

    @Schema(description = "Dwell Time (ms)", example = "1000")
    private int dwellTime;

    @Schema(description = "프리셋 라벨", example = "기본")
    private String label;
}
