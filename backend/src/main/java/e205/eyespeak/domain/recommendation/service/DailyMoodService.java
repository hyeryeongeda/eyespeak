package e205.eyespeak.domain.recommendation.service;

import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.recommendation.dto.request.DailyMoodCreateRequest;
import e205.eyespeak.domain.recommendation.dto.response.DailyMoodResponse;
import e205.eyespeak.domain.recommendation.entity.DailyMood;
import e205.eyespeak.domain.recommendation.repository.DailyMoodRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DailyMoodService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;
    private final DailyMoodRepository dailyMoodRepository;

    /** POST — 오늘 기분 등록 (중복 시 409 에러) */
    @Transactional
    public DailyMoodResponse recordDailyMood(Long userId, DailyMoodCreateRequest request) {
        Matching matching = getMatchingByUserId(userId);
        LocalDate today = LocalDate.now();

        if (dailyMoodRepository.findByMatchingIdAndMoodDate(matching.getId(), today).isPresent()) {
            throw new BusinessException(ErrorCode.MOOD_ALREADY_RECORDED);
        }

        DailyMood dailyMood = DailyMood.builder()
                .matching(matching)
                .moodDate(today)
                .moodType(request.getMoodType())
                .moodLevel(request.getMoodLevel())
                .build();

        dailyMoodRepository.save(dailyMood);
        return DailyMoodResponse.from(dailyMood);
    }

    /** GET — 오늘 기분 조회 (없으면 null) */
    public DailyMoodResponse getTodayMood(Long userId) {
        Matching matching = getMatchingByUserId(userId);
        return dailyMoodRepository
                .findByMatchingIdAndMoodDate(matching.getId(), LocalDate.now())
                .map(DailyMoodResponse::from)
                .orElse(null);
    }

    private Matching getMatchingByUserId(Long userId) {
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
}
