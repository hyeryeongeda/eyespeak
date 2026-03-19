package e205.eyespeak.domain.routine.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RoutineSlotRequest {

    @NotNull(message = "시간대 ID는 필수입니다")
    @Min(value = 1, message = "시간대 ID는 1~7 범위입니다")
    @Max(value = 7, message = "시간대 ID는 1~7 범위입니다")
    private Long timeSlotId;

    @NotNull(message = "활동 태그 ID는 필수입니다")
    @Min(value = 1, message = "활동 태그 ID는 1~11 범위입니다")
    @Max(value = 11, message = "활동 태그 ID는 1~11 범위입니다")
    private Long activityTagId;
}
