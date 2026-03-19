package e205.eyespeak.domain.routine.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.dto.request.RegisterPatientRequest;
import e205.eyespeak.domain.routine.dto.request.RoutineCreateRequest;
import e205.eyespeak.domain.routine.dto.request.RoutineSlotRequest;
import e205.eyespeak.domain.routine.dto.response.RoutineListResponse;
import e205.eyespeak.domain.routine.dto.response.RoutineSlotResponse;
import e205.eyespeak.domain.routine.entity.ActivityTag;
import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import e205.eyespeak.domain.routine.entity.TimeSlot;
import e205.eyespeak.domain.routine.repository.ActivityTagRepository;
import e205.eyespeak.domain.routine.repository.RoutineSlotTagRepository;
import e205.eyespeak.domain.routine.repository.TimeSlotRepository;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoutineService {

    private final RoutineSlotTagRepository routineSlotTagRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final ActivityTagRepository activityTagRepository;
    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;

    @Transactional
    public void createRoutine(Long userId, RoutineCreateRequest request) {
        Matching matching = getMatchingByUserId(userId);
        validateNoDuplicateTimeSlots(request.getRoutines());
        persistRoutineSlots(matching, request.getRoutines());
    }

    public RoutineListResponse getRoutines(Long userId) {
        Matching matching = getMatchingByUserId(userId);

        List<RoutineSlotResponse> routines = routineSlotTagRepository.findByMatchingId(matching.getId())
                .stream()
                .map(RoutineSlotResponse::from)
                .collect(Collectors.toList());

        return RoutineListResponse.from(routines);
    }

    @Transactional
    public void updateRoutine(Long userId, RoutineCreateRequest request) {
        Matching matching = getMatchingByUserId(userId);
        validateNoDuplicateTimeSlots(request.getRoutines());
        routineSlotTagRepository.deleteByMatchingId(matching.getId());
        persistRoutineSlots(matching, request.getRoutines());
    }

    /**
     * 환자 등록 설문의 루틴(문자열 ID)을 저장합니다. 시간대당 태그가 여러 개면 행을 여러 개 만듭니다.
     */
    @Transactional
    public void saveSurveyRoutines(Matching matching, List<RegisterPatientRequest.RoutineDto> routineDtos) {
        if (routineDtos == null || routineDtos.isEmpty()) {
            return;
        }
        List<RoutineSlotRequest> slots = mapSurveyRoutinesToSlots(routineDtos);
        validateNoDuplicateTimeSlots(slots);
        persistRoutineSlots(matching, slots);
    }

    private List<RoutineSlotRequest> mapSurveyRoutinesToSlots(List<RegisterPatientRequest.RoutineDto> routineDtos) {
        if (routineDtos == null || routineDtos.isEmpty()) {
            return List.of();
        }
        List<RoutineSlotRequest> out = new ArrayList<>();
        for (RegisterPatientRequest.RoutineDto dto : routineDtos) {
            if (dto.getSlotId() == null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT);
            }
            long timeSlotId = parsePositiveLong(dto.getSlotId(), "time slot id");
            List<String> tagIds = dto.getSelectedTagIds() != null ? dto.getSelectedTagIds() : Collections.emptyList();
            for (String tagIdStr : tagIds) {
                long activityTagId = parsePositiveLong(tagIdStr, "activity tag id");
                out.add(new RoutineSlotRequest(timeSlotId, activityTagId));
            }
        }
        return out;
    }

    private static long parsePositiveLong(String raw, String fieldLabel) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private Matching getMatchingByUserId(Long userId) {
        Guardian guardian = guardianRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));

        return matchingRepository.findByGuardianId(guardian.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
    }

    private void validateNoDuplicateTimeSlots(List<RoutineSlotRequest> routines) {
        Set<Long> timeSlotIds = routines.stream()
                .map(RoutineSlotRequest::getTimeSlotId)
                .collect(Collectors.toSet());

        if (timeSlotIds.size() != 7) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private void persistRoutineSlots(Matching matching, List<RoutineSlotRequest> routines) {
        List<RoutineSlotTag> entities = routines.stream()
                .map(slot -> {
                    TimeSlot timeSlot = timeSlotRepository.findById(slot.getTimeSlotId())
                            .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
                    ActivityTag activityTag = activityTagRepository.findById(slot.getActivityTagId())
                            .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));

                    return RoutineSlotTag.builder()
                            .matching(matching)
                            .timeSlot(timeSlot)
                            .activityTag(activityTag)
                            .build();
                })
                .collect(Collectors.toList());

        routineSlotTagRepository.saveAll(entities);
    }
}
