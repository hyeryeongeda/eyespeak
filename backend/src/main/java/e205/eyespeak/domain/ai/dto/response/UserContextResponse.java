package e205.eyespeak.domain.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * AI 서버용 환자 맞춤 데이터 통합 응답
 * - AI 서버의 _load_user_data_from_db() 반환값과 동일한 구조
 */
@Getter
@Builder
@Schema(description = "환자 맞춤 컨텍스트 응답")
public class UserContextResponse {

    @Schema(description = "환자의 맞춤 표현 목록")
    private final List<ExpressionDto> userExpressions;

    @Schema(description = "단어 조합용 단어 목록")
    private final WordListsDto wordLists;

    @Schema(description = "오늘의 데이터 (기분, 일정, 사용 통계)")
    private final TodayDataDto todayData;

    // ─── 내부 DTO ───

    @Getter
    @Builder
    @Schema(description = "맞춤 표현")
    public static class ExpressionDto {

        @Schema(description = "표현 ID", example = "1")
        private final Long exprId;

        @Schema(description = "표현 텍스트", example = "물 좀 줘")
        private final String text;

        @Schema(description = "감정 유형", example = "NEUTRAL")
        private final String sentiment;

        @Schema(description = "카테고리", example = "영양/수분")
        private final String category;

        @Schema(description = "마지막 사용 시각", example = "2026-03-13T11:30:00")
        private final String lastUsed;

        @Schema(description = "사용 횟수", example = "5")
        private final int usageCount;

        @Schema(description = "키워드 목록", example = "[\"물\", \"주다\"]")
        private final List<String> keywords;
    }

    @Getter
    @Builder
    @Schema(description = "단어 목록")
    public static class WordListsDto {

        @Schema(description = "주어 목록", example = "[\"나\", \"우리\"]")
        private final List<String> subjects;

        @Schema(description = "목적어 목록", example = "[\"물\", \"음식\"]")
        private final List<String> objects;

        @Schema(description = "동사 목록", example = "[\"먹다\", \"마시다\"]")
        private final List<String> verbs;

        @Schema(description = "문장부호 목록", example = "[\".\", \"!\", \"?\"]")
        private final List<String> punctuation;
    }

    @Getter
    @Builder
    @Schema(description = "오늘의 데이터")
    public static class TodayDataDto {

        @Schema(description = "오늘 기분", example = "HAPPY")
        private final String mood;

        @Schema(description = "기분 강도 (1~5)", example = "4")
        private final Integer moodLevel;

        @Schema(description = "오늘 일정 목록")
        private final List<ScheduleDto> schedule;

        @Schema(description = "오늘 가장 많이 사용한 표현")
        private final UsageStatDto mostUsedToday;

        @Schema(description = "마지막 사용 표현")
        private final UsageStatDto lastUsedFeature;
    }

    @Getter
    @Builder
    @Schema(description = "일정 항목")
    public static class ScheduleDto {

        @Schema(description = "시간대", example = "기상/아침")
        private final String time;

        @Schema(description = "활동", example = "경관식/수분 섭취")
        private final String event;
    }

    @Getter
    @Builder
    @Schema(description = "사용 통계")
    public static class UsageStatDto {

        @Schema(description = "카테고리", example = "영양/수분")
        private final String category;

        @Schema(description = "표현 텍스트", example = "물 좀 줘")
        private final String expression;

        @Schema(description = "사용 횟수 (mostUsedToday만)", example = "3")
        private final Integer count;

        @Schema(description = "사용 시각 (lastUsedFeature만)", example = "11:30")
        private final String time;
    }
}
