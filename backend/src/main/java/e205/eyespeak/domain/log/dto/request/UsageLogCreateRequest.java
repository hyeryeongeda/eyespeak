package e205.eyespeak.domain.log.dto.request;

/**
 * 사용 로그 저장 요청 DTO
 * - 환자가 문구/표현/키보드 입력을 최종 선택했을 때 프론트에서 보내는 데이터
 * - phraseId / exprId / content 중 정확히 1개만 값이 있어야 함
 */

import e205.eyespeak.global.enums.MoodType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "사용 로그 저장 요청")
public class UsageLogCreateRequest {

    @Schema(description = "시드 문구 ID (몸과마음/즐겨찾기에서 선택 시)", example = "101")
    private Long phraseId;

    @Schema(description = "맞춤 표현 ID (맞춤대화에서 선택 시)", example = "55")
    private Long exprId;

    @Schema(description = "자유 입력 텍스트 (키보드 입력 시)", example = "배고파")
    private String content;

    @Schema(description = "환자 기분 종류", example = "HAPPY")
    private MoodType moodType;

    @Min(1) @Max(5)
    @Schema(description = "감정 정도 1~5", example = "4")
    private Integer moodLevel;
}
