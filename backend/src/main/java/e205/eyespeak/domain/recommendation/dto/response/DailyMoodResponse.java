package e205.eyespeak.domain.recommendation.dto.response;

import e205.eyespeak.domain.recommendation.entity.DailyMood;
import e205.eyespeak.global.enums.MoodType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
@Schema(description = "일일 기분 응답")
public class DailyMoodResponse {

    @Schema(description = "기분 기록 ID", example = "1")
    private final Long moodId;

    @Schema(description = "기분 날짜", example = "2026-03-24")
    private final LocalDate moodDate;

    @Schema(description = "기분 종류", example = "HAPPY")
    private final MoodType moodType;

    @Schema(description = "감정 정도 1~5", example = "4")
    private final Integer moodLevel;

    public static DailyMoodResponse from(DailyMood dailyMood) {
        return DailyMoodResponse.builder()
                .moodId(dailyMood.getId())
                .moodDate(dailyMood.getMoodDate())
                .moodType(dailyMood.getMoodType())
                .moodLevel(dailyMood.getMoodLevel())
                .build();
    }
}
