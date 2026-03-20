package e205.eyespeak.domain.record.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@AllArgsConstructor
public class DailyRecordDetailResponse {

    @Schema(description = "조회 날짜", example = "2026-03-20")
    private LocalDate date;

    @Schema(description = "해당 날짜 표현 사용 총 건수", example = "25")
    private long totalExpressionCount;

    @Schema(description = "가장 많이 사용한 표현 TOP 5")
    private List<TopExpressionResponse> topExpressions;

    @Schema(description = "일반 호출 건수", example = "3")
    private long normalCallCount;

    @Schema(description = "SOS 호출 건수", example = "1")
    private long sosCallCount;
}
