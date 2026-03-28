package e205.eyespeak.domain.log.service;

/**
 * 사용 로그 저장 서비스
 * - 환자가 문구/표현/키보드 입력을 선택하면 호출됨
 * - phraseId/exprId/content에 따라 DB에서 엔티티를 조회한 뒤 UsageLog를 생성·저장
 * - timeSlotId는 현재 시각 기준으로 자동 계산
 */

import e205.eyespeak.domain.category.entity.Phrase;
import e205.eyespeak.domain.category.repository.PhraseRepository;
import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.log.dto.request.UsageLogCreateRequest;
import e205.eyespeak.domain.log.entity.UsageLog;
import e205.eyespeak.domain.log.repository.UsageLogRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.recommendation.entity.Expression;
import e205.eyespeak.domain.recommendation.repository.ExpressionRepository;
import e205.eyespeak.domain.routine.entity.TimeSlot;
import e205.eyespeak.domain.routine.repository.TimeSlotRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
@Transactional
public class UsageLogService {

    private final UsageLogRepository usageLogRepository;
    private final MatchingRepository matchingRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final GuardianRepository guardianRepository;
    private final PhraseRepository phraseRepository;
    private final ExpressionRepository expressionRepository;
    private final TimeSlotRepository timeSlotRepository;

    public void create(Long userId, UsageLogCreateRequest request) {
        // 1. userId → Matching 조회
        Matching matching = getMatchingByUserId(userId);

        // 2. phraseId가 있으면 DB에서 Phrase 조회
        Phrase phrase = null;
        if (request.getPhraseId() != null) {
            phrase = phraseRepository.findById(request.getPhraseId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.EXPRESSION_NOT_FOUND));
        }

        // 3. exprId가 있으면 DB에서 Expression 조회
        Expression expression = null;
        if (request.getExprId() != null) {
            expression = expressionRepository.findById(request.getExprId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.EXPRESSION_NOT_FOUND));
        }

        // 4. 현재 시각으로 TimeSlot 자동 계산
        LocalDateTime now = LocalDateTime.now();
        TimeSlot timeSlot = timeSlotRepository.findByTime(now.toLocalTime())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 5. UsageLog 생성 (Builder 내부에서 검증 실행)
        UsageLog usageLog = UsageLog.builder()
                .matching(matching)
                .phrase(phrase)
                .expression(expression)
                .content(request.getContent())
                .timeSlot(timeSlot)
                .moodType(request.getMoodType())
                .moodLevel(request.getMoodLevel())
                .usedAt(now)
                .build();

        // 6. DB 저장
        usageLogRepository.save(usageLog);
    }

    /**
     * userId로 Matching 조회 (환자/보호자 양쪽 다 지원)
     */
    private Matching getMatchingByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            Guardian guardian = guardianRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
            return matchingRepository.findByGuardianId(guardian.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        } else {
            Patient patient = patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PATIENT_NOT_FOUND));
            return matchingRepository.findByPatientId(patient.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        }
    }
}
