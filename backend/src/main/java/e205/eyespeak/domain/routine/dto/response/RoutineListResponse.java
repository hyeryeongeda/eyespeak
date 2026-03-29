package e205.eyespeak.domain.routine.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RoutineListResponse {

    @Schema(description = "시간대별 루틴 목록")
    private List<RoutineSlotResponse> routines;

    public static RoutineListResponse from(List<RoutineSlotResponse> routines) {
        return RoutineListResponse.builder()
                .routines(routines)
                .build();
    }
}
