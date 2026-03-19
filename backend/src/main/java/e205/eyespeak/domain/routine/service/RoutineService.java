package e205.eyespeak.domain.routine.service;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.patient.dto.request.RegisterPatientRequest;
import e205.eyespeak.domain.routine.entity.ActivityTag;
import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import e205.eyespeak.domain.routine.entity.TimeSlot;
import e205.eyespeak.domain.routine.repository.ActivityTagRepository;
import e205.eyespeak.domain.routine.repository.RoutineSlotTagRepository;
import e205.eyespeak.domain.routine.repository.TimeSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoutineService {

    private final RoutineSlotTagRepository routineSlotTagRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final ActivityTagRepository activityTagRepository;

    @Transactional
    public void saveRoutines(Matching matching, List<RegisterPatientRequest.RoutineDto> routines) {
        if (routines == null || routines.isEmpty()) {
            return;
        }

        for (RegisterPatientRequest.RoutineDto routine : routines) {
            if (routine.getSelectedTagIds() == null || routine.getSelectedTagIds().isEmpty()) {
                continue;
            }

            // slotId가 숫자가 아니면 스킵 (프론트에서 문자열 ID 사용 중 — 팀원 연동 시 매핑 필요)
            Long slotId;
            try {
                slotId = Long.parseLong(routine.getSlotId());
            } catch (NumberFormatException e) {
                continue;
            }

            TimeSlot timeSlot = timeSlotRepository.findById(slotId)
                    .orElse(null);
            if (timeSlot == null) {
                continue;
            }

            for (String tagIdStr : routine.getSelectedTagIds()) {
                Long tagId;
                try {
                    tagId = Long.parseLong(tagIdStr);
                } catch (NumberFormatException e) {
                    continue;
                }

                ActivityTag activityTag = activityTagRepository.findById(tagId)
                        .orElse(null);
                if (activityTag == null) {
                    continue;
                }

                RoutineSlotTag routineSlotTag = RoutineSlotTag.builder()
                        .matching(matching)
                        .timeSlot(timeSlot)
                        .activityTag(activityTag)
                        .build();
                routineSlotTagRepository.save(routineSlotTag);
            }
        }
    }
}
