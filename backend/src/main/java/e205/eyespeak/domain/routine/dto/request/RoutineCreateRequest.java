package e205.eyespeak.domain.routine.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class RoutineCreateRequest {

    @Schema(description = "시간대별 루틴 목록 (7개 필수)")
    @NotNull(message = "루틴 목록은 필수입니다")
    @Size(min = 7, max = 7, message = "7개 시간대 모두 입력해야 합니다")
    @Valid
    private List<RoutineSlotRequest> routines;
}
