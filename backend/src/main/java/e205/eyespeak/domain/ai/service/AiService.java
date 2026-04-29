package e205.eyespeak.domain.ai.service;

import e205.eyespeak.domain.ai.dto.response.GeneralCorpusResponse;
import e205.eyespeak.domain.ai.dto.response.UserContextResponse;
import e205.eyespeak.domain.ai.dto.response.UserContextResponse.*;
import e205.eyespeak.domain.log.repository.UsageLogRepository;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.recommendation.entity.Expression;
import e205.eyespeak.domain.recommendation.entity.ExpressionKeyword;
import e205.eyespeak.domain.recommendation.entity.UserWords;
import e205.eyespeak.domain.recommendation.repository.*;
import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import e205.eyespeak.domain.routine.repository.RoutineSlotTagRepository;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AI 서버 전용 내부 API 서비스
 * - AI 서버가 필요한 데이터를 DB에서 조회하여 반환
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiService {

    private final GeneralCorpusRepository generalCorpusRepository;
    private final ExpressionRepository expressionRepository;
    private final ExpressionKeywordRepository expressionKeywordRepository;
    private final UserWordsRepository userWordsRepository;
    private final DailyMoodRepository dailyMoodRepository;
    private final RoutineSlotTagRepository routineSlotTagRepository;
    private final UsageLogRepository usageLogRepository;
    private final MatchingRepository matchingRepository;

    private static final List<String> DEFAULT_SUBJECTS = List.of("나", "우리", "손녀딸", "딸", "여보");
    private static final List<String> DEFAULT_OBJECTS = List.of("물", "음식", "약");
    private static final List<String> DEFAULT_VERBS = List.of("먹다", "마시다", "보다", "좋아하다");
    private static final List<String> PUNCTUATION = List.of(".", "!", "?");

    /** 범용 말뭉치 전체 조회 */
    public List<GeneralCorpusResponse> getGeneralCorpus() {
        return generalCorpusRepository.findAll().stream()
                .map(GeneralCorpusResponse::from)
                .toList();
    }

    /** 환자 맞춤 데이터 통합 조회 */
    public UserContextResponse getUserContext(Long matchingId) {
        matchingRepository.findById(matchingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));

        return UserContextResponse.builder()
                .userExpressions(buildUserExpressions(matchingId))
                .wordLists(buildWordLists(matchingId))
                .todayData(buildTodayData(matchingId))
                .build();
    }

    // ─── 1. expressions + keywords + usageCount ───

    private List<ExpressionDto> buildUserExpressions(Long matchingId) {
        List<Expression> expressions = expressionRepository.findByMatchingId(matchingId);
        if (expressions.isEmpty()) {
            return List.of();
        }

        // 표현별 키워드 벌크 조회 (N+1 방지)
        List<Long> exprIds = expressions.stream().map(Expression::getId).toList();
        Map<Long, List<String>> keywordMap = expressionKeywordRepository
                .findByExpressionIdIn(exprIds).stream()
                .collect(Collectors.groupingBy(
                        ek -> ek.getExpression().getId(),
                        Collectors.mapping(ExpressionKeyword::getKeyword, Collectors.toList())
                ));

        // 표현별 사용 횟수 벌크 조회
        Map<Long, Long> usageCountMap = new HashMap<>();
        for (Object[] row : usageLogRepository.countByMatchingIdGroupByExpression(matchingId)) {
            usageCountMap.put((Long) row[0], (Long) row[1]);
        }

        return expressions.stream().map(expr -> ExpressionDto.builder()
                .exprId(expr.getId())
                .text(expr.getContent())
                .sentiment(expr.getSentiment() != null ? expr.getSentiment().name() : null)
                .category(expr.getCategory())
                .lastUsed(expr.getLastUsed() != null ? expr.getLastUsed().toString() : null)
                .usageCount(usageCountMap.getOrDefault(expr.getId(), 0L).intValue())
                .keywords(keywordMap.getOrDefault(expr.getId(), List.of()))
                .build()
        ).toList();
    }

    // ─── 2. word_lists ───

    private WordListsDto buildWordLists(Long matchingId) {
        Optional<UserWords> userWordsOpt = userWordsRepository.findByMatchingId(matchingId);

        if (userWordsOpt.isPresent()) {
            UserWords uw = userWordsOpt.get();
            return WordListsDto.builder()
                    .subjects(parseJsonList(uw.getSubjects(), DEFAULT_SUBJECTS))
                    .objects(parseJsonList(uw.getObjects(), DEFAULT_OBJECTS))
                    .verbs(parseJsonList(uw.getVerbs(), DEFAULT_VERBS))
                    .punctuation(PUNCTUATION)
                    .build();
        }

        return WordListsDto.builder()
                .subjects(DEFAULT_SUBJECTS)
                .objects(DEFAULT_OBJECTS)
                .verbs(DEFAULT_VERBS)
                .punctuation(PUNCTUATION)
                .build();
    }

    /** JSON 배열 문자열 → List<String> 변환. null이거나 빈값이면 기본값 반환 */
    private List<String> parseJsonList(String json, List<String> defaultValue) {
        if (json == null || json.isBlank()) {
            return defaultValue;
        }
        // JSON 배열 파싱: ["나", "우리"] → List.of("나", "우리")
        String trimmed = json.trim();
        if (!trimmed.startsWith("[")) {
            return defaultValue;
        }
        trimmed = trimmed.substring(1, trimmed.length() - 1); // [] 제거
        if (trimmed.isBlank()) {
            return defaultValue;
        }
        return Arrays.stream(trimmed.split(","))
                .map(s -> s.trim().replaceAll("^\"|\"$", "")) // 따옴표 제거
                .filter(s -> !s.isEmpty())
                .toList();
    }

    // ─── 3. todayData ───

    private TodayDataDto buildTodayData(Long matchingId) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.plusDays(1).atStartOfDay();

        TodayDataDto.TodayDataDtoBuilder builder = TodayDataDto.builder();

        // 3-1. 오늘 기분
        dailyMoodRepository.findByMatchingIdAndMoodDate(matchingId, today)
                .ifPresent(mood -> {
                    builder.mood(mood.getMoodType().name());
                    builder.moodLevel(mood.getMoodLevel());
                });

        // 3-2. 일정 (전체 시간대)
        List<RoutineSlotTag> routineSlots = routineSlotTagRepository.findByMatchingId(matchingId);
        if (!routineSlots.isEmpty()) {
            List<ScheduleDto> schedule = routineSlots.stream()
                    .map(rst -> ScheduleDto.builder()
                            .time(rst.getTimeSlot().getName())
                            .event(rst.getActivityTag().getName())
                            .build())
                    .toList();
            builder.schedule(schedule);
        }

        // 3-3. 오늘 가장 많이 사용한 표현
        List<Object[]> mostUsed = usageLogRepository.findTodayMostUsedExpression(
                matchingId, todayStart, todayEnd, PageRequest.of(0, 1));
        if (!mostUsed.isEmpty()) {
            Object[] row = mostUsed.get(0);
            builder.mostUsedToday(UsageStatDto.builder()
                    .expression((String) row[0])
                    .category((String) row[1])
                    .count(((Long) row[2]).intValue())
                    .build());
        }

        // 3-4. 마지막 사용 표현
        List<Object[]> lastUsed = usageLogRepository.findLastUsedExpressionDetail(
                matchingId, PageRequest.of(0, 1));
        if (!lastUsed.isEmpty()) {
            Object[] row = lastUsed.get(0);
            LocalDateTime usedAt = (LocalDateTime) row[2];
            builder.lastUsedFeature(UsageStatDto.builder()
                    .expression((String) row[0])
                    .category((String) row[1])
                    .time(usedAt != null ? usedAt.toLocalTime().format(
                            java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : null)
                    .build());
        }

        return builder.build();
    }
}
