package e205.eyespeak.domain.record.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class MonthlyRecordResponse {

    @Schema(description = "조회 연도", example = "2026")
    private int year;

    @Schema(description = "조회 월", example = "3")
    private int month;

    @Schema(description = "해당 월의 모든 날짜별 요약 (28~31개)")
    private List<DailyRecordSummary> days;
}
