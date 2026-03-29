package e205.eyespeak.domain.record.service;

import e205.eyespeak.domain.call.repository.CallRepository;
import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.log.repository.UsageLogRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.record.dto.response.*;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.CallType;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunicationRecordService {

    private static final int RETENTION_DAYS = 90;
    private static final int TOP_EXPRESSION_LIMIT = 5;

    private final UsageLogRepository usageLogRepository;
    private final CallRepository callRepository;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;

    public MonthlyRecordResponse getMonthlyRecords(Long userId, int year, int month) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth().plusDays(1);

        // 90일 보관 기간 클램프
        LocalDate retentionLimit = LocalDate.now().minusDays(RETENTION_DAYS);
        if (startDate.isBefore(retentionLimit)) {
            startDate = retentionLimit;
        }

        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atStartOfDay();

        // 날짜별 표현 건수
        List<Object[]> dailyCounts = usageLogRepository.countByMatchingIdGroupByDate(
                matching.getId(), start, end);
        Map<LocalDate, Long> countMap = new HashMap<>();
        for (Object[] row : dailyCounts) {
            countMap.put((LocalDate) row[0], (Long) row[1]);
        }

        // SOS 호출이 있는 날짜 목록
        List<LocalDate> sosDates = callRepository.findDistinctDatesByMatchingIdAndType(
                matching.getId(), CallType.SOS, start, end);
        Set<LocalDate> sosDateSet = new HashSet<>(sosDates);

        // 해당 월의 모든 날짜 생성
        List<DailyRecordSummary> days = new ArrayList<>();
        LocalDate cursor = yearMonth.atDay(1);
        LocalDate monthEnd = yearMonth.atEndOfMonth();
        while (!cursor.isAfter(monthEnd)) {
            days.add(new DailyRecordSummary(
                    cursor,
                    countMap.getOrDefault(cursor, 0L),
                    sosDateSet.contains(cursor)
            ));
            cursor = cursor.plusDays(1);
        }

        return new MonthlyRecordResponse(year, month, days);
    }

    public DailyRecordDetailResponse getDailyRecord(Long userId, LocalDate date) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        // 90일 보관 기간 체크
        LocalDate retentionLimit = LocalDate.now().minusDays(RETENTION_DAYS);
        if (date.isBefore(retentionLimit)) {
            return new DailyRecordDetailResponse(date, 0, List.of(), 0, 0);
        }

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        // 총 표현 건수
        long totalCount = usageLogRepository.countByMatchingIdAndUsedAtBetween(
                matching.getId(), start, end);

        // TOP 5 표현
        List<Object[]> topRows = usageLogRepository.findTopExpressions(
                matching.getId(), start, end, PageRequest.of(0, TOP_EXPRESSION_LIMIT));
        List<TopExpressionResponse> topExpressions = new ArrayList<>();
        for (int i = 0; i < topRows.size(); i++) {
            Object[] row = topRows.get(i);
            topExpressions.add(new TopExpressionResponse(
                    i + 1,
                    (String) row[0],
                    (Long) row[1]
            ));
        }

        // 호출 타입별 건수
        List<Object[]> callCounts = callRepository.countByMatchingIdGroupByType(
                matching.getId(), start, end);
        long normalCallCount = 0;
        long sosCallCount = 0;
        for (Object[] row : callCounts) {
            CallType type = (CallType) row[0];
            long count = (Long) row[1];
            if (type == CallType.NORMAL) {
                normalCallCount = count;
            } else if (type == CallType.SOS) {
                sosCallCount = count;
            }
        }

        return new DailyRecordDetailResponse(date, totalCount, topExpressions,
                normalCallCount, sosCallCount);
    }

    private void validateGuardianRole(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (user.getRole() != Role.GUARDIAN) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    private Matching getMatchingByUserId(Long userId) {
        Guardian guardian = guardianRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
        return matchingRepository.findByGuardianId(guardian.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
    }
}
