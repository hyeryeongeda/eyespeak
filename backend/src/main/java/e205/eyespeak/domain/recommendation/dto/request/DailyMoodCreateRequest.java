package e205.eyespeak.domain.recommendation.dto.request;

import e205.eyespeak.global.enums.MoodType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "일일 기분 기록 요청")
public class DailyMoodCreateRequest {

    @NotNull(message = "기분 종류는 필수입니다")
    @Schema(description = "환자 기분 종류", example = "HAPPY")
    private MoodType moodType;

    @NotNull(message = "감정 정도는 필수입니다")
    @Min(1) @Max(5)
    @Schema(description = "감정 정도 1~5", example = "4")
    private Integer moodLevel;
}
