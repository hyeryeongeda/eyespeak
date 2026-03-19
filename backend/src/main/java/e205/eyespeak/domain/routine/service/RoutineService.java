package e205.eyespeak.domain.routine.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
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
        saveRoutines(matching, request.getRoutines());
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
        saveRoutines(matching, request.getRoutines());
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

    private void saveRoutines(Matching matching, List<RoutineSlotRequest> routines) {
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
