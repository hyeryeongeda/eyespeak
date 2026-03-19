package e205.eyespeak.domain.routine.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RoutineListResponse {

    private List<RoutineSlotResponse> routines;

    public static RoutineListResponse from(List<RoutineSlotResponse> routines) {
        return RoutineListResponse.builder()
                .routines(routines)
                .build();
    }
}
