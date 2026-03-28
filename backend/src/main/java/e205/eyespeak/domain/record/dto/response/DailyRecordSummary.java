package e205.eyespeak.domain.record.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class DailyRecordSummary {

    @Schema(description = "날짜", example = "2026-03-20")
    private LocalDate date;

    @Schema(description = "해당 날짜의 표현 사용 총 건수", example = "12")
    private long totalCount;

    @Schema(description = "해당 날짜에 SOS 호출이 있었는지 여부", example = "true")
    private boolean hasSos;
}
