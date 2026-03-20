package e205.eyespeak.domain.routine.dto.response;

import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoutineSlotResponse {

    @Schema(description = "시간대 ID", example = "1")
    private Long timeSlotId;
    @Schema(description = "시간대 이름", example = "기상/아침")
    private String timeSlotName;
    @Schema(description = "시작 시간", example = "06:00")
    private String startTime;
    @Schema(description = "종료 시간", example = "09:00")
    private String endTime;
    @Schema(description = "활동 태그 ID", example = "3")
    private Long activityTagId;
    @Schema(description = "활동 태그 이름", example = "구강 케어")
    private String activityTagName;

    public static RoutineSlotResponse from(RoutineSlotTag routineSlotTag) {
        return RoutineSlotResponse.builder()
                .timeSlotId(routineSlotTag.getTimeSlot().getId())
                .timeSlotName(routineSlotTag.getTimeSlot().getName())
                .startTime(routineSlotTag.getTimeSlot().getStartTime().toString())
                .endTime(routineSlotTag.getTimeSlot().getEndTime().toString())
                .activityTagId(routineSlotTag.getActivityTag().getId())
                .activityTagName(routineSlotTag.getActivityTag().getName())
                .build();
    }
}
