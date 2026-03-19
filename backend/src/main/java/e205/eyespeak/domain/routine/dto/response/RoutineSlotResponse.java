package e205.eyespeak.domain.routine.dto.response;

import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoutineSlotResponse {

    private Long timeSlotId;
    private String timeSlotName;
    private String startTime;
    private String endTime;
    private Long activityTagId;
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
