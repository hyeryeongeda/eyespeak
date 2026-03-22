package e205.eyespeak.domain.recommendation.service;

import e205.eyespeak.domain.log.entity.UsageLog;
import e205.eyespeak.domain.log.repository.UsageLogRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.recommendation.dto.response.ExpressionRecordResponse;
import e205.eyespeak.domain.recommendation.entity.Expression;
import e205.eyespeak.domain.recommendation.entity.ExpressionKeyword;
import e205.eyespeak.domain.recommendation.repository.ExpressionKeywordRepository;
import e205.eyespeak.domain.recommendation.repository.ExpressionRepository;
import e205.eyespeak.domain.routine.repository.TimeSlotRepository;
import e205.eyespeak.global.enums.SentimentType;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 표현 분류 + 기록 저장 서비스
 * - 기존 AI 서버의 /expressions/use 로직을 BE로 이전
 * - AI 서버에는 분류만 요청, DB 저장은 BE가 전담
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ExpressionRecordService {

    private final ExpressionRepository expressionRepository;
    private final ExpressionKeywordRepository expressionKeywordRepository;
    private final UsageLogRepository usageLogRepository;
    private final MatchingRepository matchingRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final RestTemplate restTemplate;

    @Value("${ai.server.url}")
    private String aiServerUrl;

    /**
     * 표현 사용 기록
     * 1. 기존 표현이면 lastUsed 갱신
     * 2. 신규 표현이면 AI 분류 → Expression + keywords 저장
     * 3. usage_log는 항상 INSERT
     */
    public ExpressionRecordResponse recordExpression(Long matchingId, String text) {
        Matching matching = matchingRepository.findById(matchingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();
        boolean isNew;
        Expression expression;

        // 1. 기존 표현 확인
        Optional<Expression> existingOpt = expressionRepository
                .findByMatchingIdAndContent(matchingId, text);

        if (existingOpt.isPresent()) {
            // 기존 표현 → lastUsed만 갱신
            expression = existingOpt.get();
            expression.updateLastUsed(now);
            isNew = false;
        } else {
            // 신규 표현 → AI 분류 후 저장
            ClassifyResult classified = callAiClassify(text);

            expression = Expression.builder()
                    .matching(matching)
                    .content(text)
                    .sentiment(classified.sentiment)
                    .category(classified.category)
                    .build();
            expression.updateLastUsed(now);
            expressionRepository.save(expression);

            // 키워드 저장
            for (String keyword : classified.keywords) {
                if (keyword != null && !keyword.isBlank()) {
                    expressionKeywordRepository.save(
                            ExpressionKeyword.builder()
                                    .expression(expression)
                                    .keyword(keyword.trim())
                                    .build()
                    );
                }
            }
            isNew = true;
        }

        // 2. usage_log는 항상 INSERT (같은 표현이라도 매번 기록)
        UsageLog usageLog = UsageLog.builder()
                .matching(matching)
                .expression(expression)
                .timeSlot(timeSlotRepository.findByTime(now.toLocalTime())
                        .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND)))
                .usedAt(now)
                .build();
        usageLogRepository.save(usageLog);

        return new ExpressionRecordResponse(expression.getId(), isNew);
    }

    /**
     * AI 서버에 문장 분류 요청
     * 실패 시 fallback: NEUTRAL / "기타" / 키워드 없음
     */
    private ClassifyResult callAiClassify(String text) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(
                    Map.of("text", text), headers);

            Map result = restTemplate.postForObject(
                    aiServerUrl + "/expressions/classify", request, Map.class);

            if (result == null) {
                return ClassifyResult.fallback();
            }

            String sentimentStr = (String) result.get("sentiment");
            if (sentimentStr == null) {
                return ClassifyResult.fallback();
            }

            SentimentType sentiment = SentimentType.valueOf(sentimentStr.toUpperCase());
            String category = (String) result.get("category");
            List<String> keywords = (List<String>) result.get("keywords");

            return new ClassifyResult(
                    sentiment,
                    category != null ? category : "기타",
                    keywords != null ? keywords : List.of()
            );
        } catch (Exception e) {
            log.warn("AI 문장 분류 실패, fallback 적용: {}", e.getMessage());
            return ClassifyResult.fallback();
        }
    }

    /** AI 분류 결과를 담는 내부 클래스 */
    private record ClassifyResult(SentimentType sentiment, String category, List<String> keywords) {
        static ClassifyResult fallback() {
            return new ClassifyResult(SentimentType.NEUTRAL, "기타", List.of());
        }
    }
}
