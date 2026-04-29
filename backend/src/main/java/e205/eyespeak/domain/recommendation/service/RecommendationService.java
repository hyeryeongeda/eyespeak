package e205.eyespeak.domain.recommendation.service;

import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.log.repository.UsageLogRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.recommendation.dto.HintsDto;
import e205.eyespeak.domain.recommendation.repository.DailyMoodRepository;
import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import e205.eyespeak.domain.routine.repository.RoutineSlotTagRepository;
import e205.eyespeak.domain.routine.repository.TimeSlotRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.MoodType;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationService {

    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final MatchingRepository matchingRepository;
    private final DailyMoodRepository dailyMoodRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final RoutineSlotTagRepository routineSlotTagRepository;
    private final UsageLogRepository usageLogRepository;

    private static final Map<MoodType, String> MOOD_KR_MAP = Map.of(
            MoodType.HAPPY, "기분 좋음",
            MoodType.SAD, "슬픔",
            MoodType.CALM, "평온",
            MoodType.JOYFUL, "즐거움",
            MoodType.ANXIOUS, "불안",
            MoodType.ANGRY, "화남",
            MoodType.TIRED, "피곤"
    );

    /**
     * userId → Matching 조회 (환자/보호자 양쪽 지원)
     * 기존 RecommendationController.getMatchingByUserId()와 동일한 로직
     */
    public Matching getMatchingByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            return guardianRepository.findByUserId(userId)
                    .flatMap(guardian -> matchingRepository.findByGuardianId(guardian.getId()))
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        } else {
            return patientRepository.findByUserId(userId)
                    .flatMap(patient -> matchingRepository.findByPatientId(patient.getId()))
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        }
    }

    /**
     * 4개 hint를 DB에서 직접 계산
     * AI 서버의 /recommend/hints 로직을 BE로 이전
     */
    public HintsDto computeHints(Long matchingId) {
        return new HintsDto(
                computeMoodHint(matchingId),
                computeScheduleHint(matchingId),
                computeFrequentHint(matchingId),
                computeRecentHint(matchingId)
        );
    }

    /** daily_mood에서 오늘 기분 조회 → 한글 매핑 */
    private String computeMoodHint(Long matchingId) {
        return dailyMoodRepository
                .findByMatchingIdAndMoodDate(matchingId, LocalDate.now())
                .map(dm -> MOOD_KR_MAP.getOrDefault(dm.getMoodType(), dm.getMoodType().name()))
                .orElse(null);
    }

    /** 현재 시간대 → routine_slot_tag + activity_tag 조회 */
    private String computeScheduleHint(Long matchingId) {
        return timeSlotRepository.findByTime(LocalTime.now())
                .map(timeSlot -> {
                    List<RoutineSlotTag> slots = routineSlotTagRepository
                            .findByMatchingIdAndTimeSlotId(matchingId, timeSlot.getId());
                    if (!slots.isEmpty()) {
                        return slots.get(0).getActivityTag().getName();
                    }
                    return null;
                })
                .orElse(null);
    }

    /** usage_log에서 전체 기간 가장 많이 사용한 표현 */
    private String computeFrequentHint(Long matchingId) {
        List<Object[]> result = usageLogRepository
                .findMostFrequentExpression(matchingId, PageRequest.of(0, 1));
        return result.isEmpty() ? null : (String) result.get(0)[0];
    }

    /** usage_log에서 가장 최근 사용한 표현 */
    private String computeRecentHint(Long matchingId) {
        List<String> result = usageLogRepository
                .findMostRecentExpressionContent(matchingId, PageRequest.of(0, 1));
        return result.isEmpty() ? null : result.get(0);
    }
}
