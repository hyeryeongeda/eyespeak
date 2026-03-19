package e205.eyespeak.domain.routine.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RoutineSlotRequest {

    @Schema(description = "시간대 ID (1~7)", example = "1")
    @NotNull(message = "시간대 ID는 필수입니다")
    @Min(value = 1, message = "시간대 ID는 1~7 범위입니다")
    @Max(value = 7, message = "시간대 ID는 1~7 범위입니다")
    private Long timeSlotId;

    @Schema(description = "활동 태그 ID (1~11)", example = "3")
    @NotNull(message = "활동 태그 ID는 필수입니다")
    @Min(value = 1, message = "활동 태그 ID는 1~11 범위입니다")
    @Max(value = 11, message = "활동 태그 ID는 1~11 범위입니다")
    private Long activityTagId;
}
